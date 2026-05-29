from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from jose import JWTError, jwt
from typing import List, Optional
import traceback

from database import get_db, engine, Base
import models, schemas, crud

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = "your-secret-key-12345"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user_from_token(token: str, db: Session):
    """Helper function to get user from token string"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token:
        print("❌ No token provided")
        raise credentials_exception
    
    print(f"🔍 Attempting to decode token: {token[:50]}...")
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        print(f"✅ Token decoded successfully. Username: {username}")
        
        if username is None:
            print("❌ No username in token payload")
            raise credentials_exception
            
        user = crud.get_user_by_username(db, username)
        if user is None:
            print(f"❌ User not found: {username}")
            raise credentials_exception
            
        print(f"✅ User authenticated: {user.username} (ID: {user.id})")
        return user
    except JWTError as e:
        print(f"❌ JWT Decode error: {str(e)}")
        raise credentials_exception

# ==================== USER ROUTES ====================
@app.post("/api/users/token", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = crud.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": user.username})
    print(f"🔐 Login successful for {user.username}")
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/api/users/register", response_model=schemas.User)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_username(db, user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    return crud.create_user(db, user)

@app.get("/api/users/me/{token}", response_model=schemas.User)
def read_users_me_with_token_path(token: str, db: Session = Depends(get_db)):
    """Get current user using token from URL path"""
    print(f"📡 User me API called with token in path")
    user = get_current_user_from_token(token, db)
    return user

# ==================== RESOURCE ROUTES (NO AUTH REQUIRED) ====================
@app.get("/api/resources", response_model=List[schemas.Resource])
def get_resources(db: Session = Depends(get_db)):
    resources = crud.get_resources(db)
    return resources

@app.get("/api/resources/{resource_id}", response_model=schemas.Resource)
def get_resource(resource_id: int, db: Session = Depends(get_db)):
    resource = crud.get_resource(db, resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    return resource

@app.post("/api/resources", response_model=schemas.Resource)
def create_resource(resource: schemas.ResourceCreate, db: Session = Depends(get_db)):
    return crud.create_resource(db, resource)

@app.put("/api/resources/{resource_id}", response_model=schemas.Resource)
def update_resource(resource_id: int, resource: schemas.ResourceUpdate, db: Session = Depends(get_db)):
    db_resource = crud.update_resource(db, resource_id, resource)
    if not db_resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    return db_resource

@app.delete("/api/resources/{resource_id}")
def delete_resource(resource_id: int, db: Session = Depends(get_db)):
    if crud.delete_resource(db, resource_id):
        return {"message": "Resource deleted successfully"}
    raise HTTPException(status_code=404, detail="Resource not found")

# ==================== BOOKING ROUTES ====================
@app.post("/api/bookings/{token}", response_model=schemas.Booking)
def create_booking_with_token(
    token: str,
    booking: schemas.BookingCreate, 
    db: Session = Depends(get_db)
):
    """Create a booking - Token passed as path parameter"""
    try:
        print(f"\n{'='*50}")
        print(f"📝 CREATE BOOKING REQUEST")
        print(f"Token (first 50 chars): {token[:50]}...")
        print(f"Booking resource_id: {booking.resource_id}")
        print(f"Booking start_time: {booking.start_time}")
        print(f"Booking end_time: {booking.end_time}")
        print(f"Booking title: {booking.title}")
        
        # Get user from token
        current_user = get_current_user_from_token(token, db)
        
        print(f"User found: {current_user.username} (ID: {current_user.id})")
        
        # Verify resource exists
        resource = crud.get_resource(db, booking.resource_id)
        if not resource:
            print(f"❌ Resource {booking.resource_id} not found")
            raise HTTPException(status_code=404, detail="Resource not found")
        
        print(f"Resource found: {resource.name}")
        
        # Create booking with current user's ID
        db_booking = crud.create_booking(db, booking, current_user.id)
        if not db_booking:
            print(f"❌ Booking conflict for resource {booking.resource_id}")
            raise HTTPException(
                status_code=409, 
                detail="Time slot conflict: This resource is already booked for the selected time"
            )
        
        print(f"✅ Booking created successfully with ID: {db_booking.id}")
        print(f"{'='*50}\n")
        return db_booking
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/api/bookings/{token}", response_model=List[schemas.Booking])
def get_my_bookings_with_token(
    token: str,
    status: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    """Get bookings for the logged-in user only - Token passed as path parameter"""
    try:
        print(f"\n{'='*50}")
        print(f"📋 GET MY BOOKINGS REQUEST")
        print(f"Token (first 50 chars): {token[:50]}...")
        
        # Get user from token
        current_user = get_current_user_from_token(token, db)
        
        print(f"User found: {current_user.username} (ID: {current_user.id})")
        print(f"Status filter: {status}")
        
        bookings = crud.get_user_bookings(db, current_user.id, status)
        
        # Load resource details for each booking
        for booking in bookings:
            booking.resource = crud.get_resource(db, booking.resource_id)
        
        print(f"Found {len(bookings)} bookings for user {current_user.username}")
        print(f"{'='*50}\n")
        return bookings
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.delete("/api/bookings/{booking_id}/{token}", response_model=dict)
def cancel_booking_with_token(
    booking_id: int,
    token: str,
    db: Session = Depends(get_db)
):
    """Cancel a booking - Token passed as path parameter"""
    try:
        print(f"\n{'='*50}")
        print(f"🗑️ CANCEL BOOKING REQUEST")
        print(f"Booking ID: {booking_id}")
        print(f"Token (first 50 chars): {token[:50]}...")
        
        # Get user from token
        current_user = get_current_user_from_token(token, db)
        
        print(f"User found: {current_user.username} (ID: {current_user.id})")
        
        booking = crud.cancel_booking(db, booking_id, current_user.id, current_user.is_admin)
        if not booking:
            print(f"❌ Booking {booking_id} not found or unauthorized")
            raise HTTPException(status_code=404, detail="Booking not found or unauthorized")
        
        print(f"✅ Booking {booking_id} cancelled successfully")
        print(f"{'='*50}\n")
        return {"message": "Booking cancelled successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Unexpected error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/api/bookings/resource/{resource_id}", response_model=List[schemas.Booking])
def get_resource_bookings(
    resource_id: int, 
    start_date: Optional[str] = None, 
    end_date: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    start = datetime.fromisoformat(start_date) if start_date else None
    end = datetime.fromisoformat(end_date) if end_date else None
    return crud.get_resource_bookings(db, resource_id, start, end)

@app.get("/")
def root():
    return {"message": "Booking API is running"}