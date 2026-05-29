from datetime import datetime, time
from typing import List

def is_within_availability(booking_start: datetime, booking_end: datetime, 
                          availability_start: time, availability_end: time, 
                          availability_days: str) -> bool:
    """Check if booking falls within resource availability window"""
    
    # Check day of week
    days_map = {
        0: 'MON', 1: 'TUE', 2: 'WED', 3: 'THU', 
        4: 'FRI', 5: 'SAT', 6: 'SUN'
    }
    
    allowed_days = [d.strip() for d in availability_days.split(',')]
    current_day = days_map[booking_start.weekday()]
    
    if current_day not in allowed_days:
        return False
    
    # Check time window
    start_time = booking_start.time()
    end_time = booking_end.time()
    
    return availability_start <= start_time and end_time <= availability_end