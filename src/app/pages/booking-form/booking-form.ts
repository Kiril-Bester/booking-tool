import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookingService } from '../../services/booking.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-booking-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './booking-form.html'
})
export class BookingFormComponent implements OnInit, OnChanges {
  @Input() resourceId?: number;
  @Output() bookingCreated = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  booking: any = {
    start_time: '',
    end_time: '',
    title: ''
  };
  
  isSubmitting = false;
  minDateTime: string;
  maxDateTime: string;
  errorMessage = '';
  bookedSlots: any[] = [];
  isLoadingSlots = false;
  
  // Time slot options (30-minute intervals from 7:00 to 23:30)
  timeSlots: string[] = [];
  availableStartTimes: string[] = [];
  availableEndTimes: string[] = [];

  constructor(
    private bookingService: BookingService,
    public authService: AuthService
  ) {
    const now = new Date();
    this.minDateTime = now.toISOString().slice(0, 16);
    
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 3);
    this.maxDateTime = maxDate.toISOString().slice(0, 16);
    
    this.generateTimeSlots();
  }

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.errorMessage = 'You must be logged in to make a booking';
      return;
    }

    this.loadBookedSlots();
    this.setDefaultTimes();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['resourceId'] && changes['resourceId'].currentValue) {
      this.loadBookedSlots();
    }
  }

  generateTimeSlots(): void {
    for (let hour = 7; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 23 && minute > 30) continue;
        
        const hourStr = hour.toString().padStart(2, '0');
        const minuteStr = minute.toString().padStart(2, '0');
        this.timeSlots.push(`${hourStr}:${minuteStr}`);
      }
    }
  }

  loadBookedSlots(): void {
    if (!this.resourceId) return;
    
    this.isLoadingSlots = true;
    
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    
    this.bookingService.getResourceBookings(this.resourceId, startDate, endDate.toISOString().split('T')[0]).subscribe({
      next: (bookings) => {
        console.log('📋 Loaded booked slots:', bookings);
        this.bookedSlots = bookings;
        this.isLoadingSlots = false;
        if (this.booking.start_time) {
          this.updateAvailableTimes();
        }
      },
      error: (err) => {
        console.error('Error loading booked slots:', err);
        this.isLoadingSlots = false;
      }
    });
  }

  // Check if exact time slot is already booked
  isExactTimeSlotBooked(date: string, startTime: string, endTime: string): boolean {
    const selectedDateTime = `${date} ${startTime}:00`;
    const selectedEndDateTime = `${date} ${endTime}:00`;
    
    return this.bookedSlots.some(booking => {
      const bookingStart = booking.start_time;
      const bookingEnd = booking.end_time;
      
      // Check for exact match
      return bookingStart === selectedDateTime && bookingEnd === selectedEndDateTime;
    });
  }

  isStartTimeBooked(date: string, startTime: string): boolean {
    const selectedDateTime = `${date} ${startTime}:00`;
    
    return this.bookedSlots.some(booking => {
      const bookingStart = booking.start_time;
      return bookingStart === selectedDateTime;
    });
  }

  isTimeSlotDisabled(timeSlot: string): boolean {
    if (!this.booking.start_time) return true;
    
    const selectedDate = this.booking.start_time.split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    
    // Check if time is in the past for today
    if (selectedDate === today) {
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeSlot = `${currentHour.toString().padStart(2, '0')}:${Math.floor(currentMinute / 30) * 30}`;
      if (timeSlot < currentTimeSlot) return true;
    }
    
    // Default end time is 1 hour after start
    const [startHour, startMinute] = timeSlot.split(':').map(Number);
    let endHour = startHour + 1;
    let endMinute = startMinute;
    if (endMinute >= 60) {
      endHour++;
      endMinute -= 60;
    }
    const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
    
    // Check if exact time slot is already booked
    return this.isExactTimeSlotBooked(selectedDate, timeSlot, endTime);
  }

  updateAvailableTimes(): void {
    if (!this.booking.start_time) return;
    
    const selectedDate = this.booking.start_time.split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    
    // Filter available start times (not booked)
    this.availableStartTimes = this.timeSlots.filter(timeSlot => {
      // Skip past times for today
      if (selectedDate === today) {
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTimeSlot = `${currentHour.toString().padStart(2, '0')}:${Math.floor(currentMinute / 30) * 30}`;
        if (timeSlot < currentTimeSlot) return false;
      }
      
      // Default end time is 1 hour after start
      const [startHour, startMinute] = timeSlot.split(':').map(Number);
      let endHour = startHour + 1;
      let endMinute = startMinute;
      if (endMinute >= 60) {
        endHour++;
        endMinute -= 60;
      }
      const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
      
      // Check if exact time slot is booked
      return !this.isExactTimeSlotBooked(selectedDate, timeSlot, endTime);
    });
    
    // Update end times if a start time is selected
    if (this.booking.start_time) {
      this.updateEndTimes();
    }
  }

  updateEndTimes(): void {
    if (!this.booking.start_time) return;
    
    const selectedStart = this.booking.start_time.split('T')[1].substring(0, 5);
    const selectedDate = this.booking.start_time.split('T')[0];
    const startIndex = this.timeSlots.indexOf(selectedStart);
    
    // End times must be after start time
    this.availableEndTimes = this.timeSlots.slice(startIndex + 1);
    
    // Filter out end times that would create an exact match with existing bookings
    this.availableEndTimes = this.availableEndTimes.filter(endTime => {
      return !this.isExactTimeSlotBooked(selectedDate, selectedStart, endTime);
    });
    
    // Auto-select first available end time if current end time is invalid
    if (this.availableEndTimes.length > 0) {
      const currentEnd = this.booking.end_time ? this.booking.end_time.split('T')[1].substring(0, 5) : null;
      if (!currentEnd || !this.availableEndTimes.includes(currentEnd)) {
        this.booking.end_time = this.booking.start_time.split('T')[0] + 'T' + this.availableEndTimes[0];
      }
    }
  }

  setDefaultTimes(): void {
    const defaultStart = new Date();
    defaultStart.setHours(defaultStart.getHours() + 1);
    defaultStart.setMinutes(0);
    
    let startDateStr = defaultStart.toISOString().slice(0, 16);
    let attempts = 0;
    
    // Find next available time slot
    while (this.isTimeSlotDisabled(startDateStr.split('T')[1].substring(0, 5)) && attempts < 48) {
      defaultStart.setMinutes(defaultStart.getMinutes() + 30);
      startDateStr = defaultStart.toISOString().slice(0, 16);
      attempts++;
    }
    
    const defaultEnd = new Date(defaultStart);
    defaultEnd.setHours(defaultEnd.getHours() + 1);
    
    this.booking.start_time = startDateStr;
    this.booking.end_time = defaultEnd.toISOString().slice(0, 16);
    this.updateAvailableTimes();
  }

  onDateChange(): void {
    this.updateAvailableTimes();
    // Reset end time
    if (this.booking.end_time) {
      const endDate = new Date(this.booking.end_time);
      const startDate = new Date(this.booking.start_time);
      if (endDate <= startDate) {
        const newEnd = new Date(startDate);
        newEnd.setHours(newEnd.getHours() + 1);
        this.booking.end_time = newEnd.toISOString().slice(0, 16);
      }
    }
  }

  onStartTimeChange(): void {
    this.updateEndTimes();
  }

  get duration(): string | null {
    if (this.booking.start_time && this.booking.end_time) {
      const startDate = new Date(this.booking.start_time);
      const endDate = new Date(this.booking.end_time);
      const diffHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
      
      if (diffHours < 1) {
        const minutes = Math.round(diffHours * 60);
        return `${minutes} minutes`;
      }
      return `${diffHours.toFixed(1)} hours`;
    }
    return null;
  }

  onSubmit(): void {
    if (!this.authService.isLoggedIn()) {
      this.errorMessage = 'Please login to make a booking';
      return;
    }

    if (!this.resourceId) {
      this.errorMessage = 'No resource selected';
      return;
    }

    if (!this.booking.start_time || !this.booking.end_time) {
      this.errorMessage = 'Please select start and end times';
      return;
    }

    const selectedDate = this.booking.start_time.split('T')[0];
    const selectedStart = this.booking.start_time.split('T')[1].substring(0, 5);
    const selectedEnd = this.booking.end_time.split('T')[1].substring(0, 5);

    // Check if exact time slot is already booked
    if (this.isExactTimeSlotBooked(selectedDate, selectedStart, selectedEnd)) {
      this.errorMessage = 'This exact time slot is already booked. Please select another time.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    
    const bookingData = {
      resource_id: this.resourceId,
      title: this.booking.title || 'Booking',
      start_time: this.booking.start_time.replace('T', ' ') + ':00',
      end_time: this.booking.end_time.replace('T', ' ') + ':00'
    };
    
    console.log('Submitting booking:', bookingData);
    
    this.bookingService.createBooking(bookingData).subscribe({
      next: (response) => {
        console.log('Booking created successfully:', response);
        this.isSubmitting = false;
        this.bookingCreated.emit();
      },
      error: (err) => {
        console.error('Booking failed:', err);
        this.isSubmitting = false;
        this.errorMessage = err.error?.detail || 'Failed to create booking. The time slot may be already taken.';
      }
    });
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}