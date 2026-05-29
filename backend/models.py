from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Time, ForeignKey, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    
    bookings = relationship("Booking", back_populates="user", cascade="all, delete-orphan")

class Resource(Base):
    __tablename__ = "resources"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    description = Column(Text)
    availability_start = Column(Time, nullable=False)
    availability_end = Column(Time, nullable=False)
    availability_days = Column(String(50), default="MON,TUE,WED,THU,FRI")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    bookings = relationship("Booking", back_populates="resource", cascade="all, delete-orphan")

class Booking(Base):
    __tablename__ = "bookings"
    
    id = Column(Integer, primary_key=True, index=True)
    resource_id = Column(Integer, ForeignKey("resources.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200))
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    status = Column(String(20), default='active')  # Simple VARCHAR, no enum!
    created_at = Column(DateTime, server_default=func.now())
    cancelled_at = Column(DateTime, nullable=True)
    
    resource = relationship("Resource", back_populates="bookings")
    user = relationship("User", back_populates="bookings")
    
    __table_args__ = (
        Index('idx_resource_time', 'resource_id', 'start_time', 'end_time', 'status'),
        Index('idx_user_bookings', 'user_id', 'status'),
        Index('idx_booking_dates', 'start_time', 'end_time'),
    )