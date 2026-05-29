from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

import crud
import schemas
from database import get_db
from routes.users import get_current_user

router = APIRouter(prefix="/api/bookings", tags=["bookings"])

@router.post("/", response_model=schemas.Booking)
def create_booking(
    booking: schemas.BookingCreate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    # Verify resource exists
    resource = crud.get_resource(db, booking.resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    # Create booking with conflict prevention
    db_booking = crud.create_booking(db, booking, current_user.id)
    if db_booking is None:
        raise HTTPException(
            status_code=409,
            detail="Time slot conflict: Resource already booked for this period"
        )
    
    return db_booking

@router.get("/", response_model=List[schemas.Booking])
def read_my_bookings(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    bookings = crud.get_user_bookings(db, current_user.id, status)
    # Load resource for each booking
    for booking in bookings:
        booking.resource = crud.get_resource(db, booking.resource_id)
    return bookings

@router.get("/resource/{resource_id}", response_model=List[schemas.Booking])
def read_resource_bookings(
    resource_id: int,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    start = datetime.fromisoformat(start_date) if start_date else None
    end = datetime.fromisoformat(end_date) if end_date else None
    
    bookings = crud.get_resource_bookings(db, resource_id, start, end)
    return bookings

@router.delete("/{booking_id}")
def cancel_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(get_current_user)
):
    booking = crud.cancel_booking(db, booking_id, current_user.id, current_user.is_admin)
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found or unauthorized")
    return {"message": "Booking cancelled successfully"}