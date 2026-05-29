from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime
from typing import List, Optional
import models, schemas
import hashlib
import base64

# Simple password hashing function
def hash_password(password: str) -> str:
    """Hash a password using SHA256"""
    salt = "booking-app-salt-2024"
    combined = password + salt
    hash_bytes = hashlib.sha256(combined.encode()).digest()
    return base64.b64encode(hash_bytes).decode()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return hash_password(plain_password) == hashed_password

# User CRUD
def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_user_by_id(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = hash_password(user.password)
    db_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def authenticate_user(db: Session, username: str, password: str):
    user = get_user_by_username(db, username)
    if not user:
        print(f"User not found: {username}")
        return False
    if not verify_password(password, user.hashed_password):
        print(f"Password verification failed for: {username}")
        print(f"Input password: {password}")
        print(f"Stored hash: {user.hashed_password}")
        return False
    print(f"User authenticated: {username}")
    return user

# Resource CRUD
def get_resources(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Resource).offset(skip).limit(limit).all()

def get_resource(db: Session, resource_id: int):
    return db.query(models.Resource).filter(models.Resource.id == resource_id).first()

def create_resource(db: Session, resource: schemas.ResourceCreate):
    db_resource = models.Resource(**resource.dict())
    db.add(db_resource)
    db.commit()
    db.refresh(db_resource)
    return db_resource

def update_resource(db: Session, resource_id: int, resource: schemas.ResourceUpdate):
    db_resource = get_resource(db, resource_id)
    if db_resource:
        update_data = resource.dict(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_resource, key, value)
        db.commit()
        db.refresh(db_resource)
    return db_resource

def delete_resource(db: Session, resource_id: int):
    db_resource = get_resource(db, resource_id)
    if db_resource:
        db.delete(db_resource)
        db.commit()
        return True
    return False

def check_booking_conflict(db: Session, resource_id: int, start_time: datetime, end_time: datetime, exclude_booking_id: Optional[int] = None):
    """Check if there's an existing booking with the EXACT same resource_id, start_time, and end_time."""
    print(f"🔍 Checking conflict - Resource {resource_id}, {start_time} to {end_time}")
    
    query = db.query(models.Booking).filter(
        models.Booking.resource_id == resource_id,
        models.Booking.start_time == start_time,
        models.Booking.end_time == end_time,
        models.Booking.status == 'active'
    )
    
    if exclude_booking_id:
        query = query.filter(models.Booking.id != exclude_booking_id)
    
    return query.first() is not None

def create_booking(db: Session, booking: schemas.BookingCreate, user_id: int):
    """Create a new booking"""
    try:
        print(f"📝 Creating booking for user {user_id}, resource {booking.resource_id}")
        
        if check_booking_conflict(db, booking.resource_id, booking.start_time, booking.end_time):
            print(f"❌ Conflict - exact time slot already booked")
            return None
        
        db_booking = models.Booking(
            resource_id=booking.resource_id,
            user_id=user_id,
            title=booking.title,
            start_time=booking.start_time,
            end_time=booking.end_time,
            status='active'
        )
        
        db.add(db_booking)
        db.commit()
        db.refresh(db_booking)
        
        print(f"✅ Booking created with ID: {db_booking.id}")
        return db_booking
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
        return None

def get_user_bookings(db: Session, user_id: int, status: Optional[str] = None):
    query = db.query(models.Booking).filter(models.Booking.user_id == user_id)
    if status:
        query = query.filter(models.Booking.status == status)
    return query.order_by(models.Booking.start_time).all()

def get_resource_bookings(db: Session, resource_id: int, start_date: Optional[datetime] = None, end_date: Optional[datetime] = None):
    query = db.query(models.Booking).filter(
        models.Booking.resource_id == resource_id,
        models.Booking.status == 'active'
    )
    if start_date:
        query = query.filter(models.Booking.start_time >= start_date)
    if end_date:
        query = query.filter(models.Booking.end_time <= end_date)
    return query.order_by(models.Booking.start_time).all()

def cancel_booking(db: Session, booking_id: int, user_id: int, is_admin: bool = False):
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    
    if not booking:
        return None
    
    if booking.user_id != user_id and not is_admin:
        return None
    
    booking.status = 'cancelled'
    booking.cancelled_at = datetime.now()
    db.commit()
    db.refresh(booking)
    return booking