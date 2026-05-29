from pydantic import BaseModel, Field, validator
from datetime import datetime, time
from typing import Optional, List
from enum import Enum

class BookingStatus(str, Enum):
    ACTIVE = "active"
    CANCELLED = "cancelled"

# User schemas
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class User(UserBase):
    id: int
    is_admin: bool
    created_at: datetime
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# Resource schemas
class ResourceBase(BaseModel):
    name: str
    description: Optional[str] = None
    availability_start: time
    availability_end: time
    availability_days: str = "MON,TUE,WED,THU,FRI"

class ResourceCreate(ResourceBase):
    pass

class ResourceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    availability_start: Optional[time] = None
    availability_end: Optional[time] = None
    availability_days: Optional[str] = None

class Resource(ResourceBase):
    id: int
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True

# Booking schemas
class BookingBase(BaseModel):
    resource_id: int
    title: Optional[str] = None
    start_time: datetime
    end_time: datetime

class BookingCreate(BookingBase):
    pass

class Booking(BookingBase):
    id: int
    user_id: int
    status: str 
    created_at: datetime
    cancelled_at: Optional[datetime] = None
    resource: Optional[Resource] = None
    class Config:
        from_attributes = True