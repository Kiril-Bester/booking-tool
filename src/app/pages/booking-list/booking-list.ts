import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BookingService } from '../../services/booking.service';
import { Booking } from '../../models/models';

@Component({
  selector: 'app-booking-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './booking-list.html'
})
export class BookingListComponent implements OnInit {
  bookings: Booking[] = [];
  filteredBookings: Booking[] = [];
  currentTab = 'upcoming';
  now = new Date();
  selectedBooking: any = null;
  isCancelling = false;

  constructor(private bookingService: BookingService) {}

  ngOnInit(): void {
    this.loadBookings();
  }

  loadBookings(): void {
    this.bookingService.getMyBookings().subscribe(data => {
      this.bookings = data;
      this.switchTab(this.currentTab);
    });
  }

  get upcomingCount(): number {
    return this.bookings.filter(b => 
      b.status === 'active' && new Date(b.start_time) > new Date()
    ).length;
  }

  get pastCount(): number {
    return this.bookings.filter(b => 
      b.status === 'active' && new Date(b.start_time) <= new Date()
    ).length;
  }

  get cancelledCount(): number {
    return this.bookings.filter(b => b.status === 'cancelled').length;
  }

  switchTab(tab: string): void {
    this.currentTab = tab;
    const now = new Date();
    
    if (tab === 'upcoming') {
      this.filteredBookings = this.bookings.filter(b => 
        b.status === 'active' && new Date(b.start_time) > now
      ).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    } else if (tab === 'past') {
      this.filteredBookings = this.bookings.filter(b => 
        b.status === 'active' && new Date(b.start_time) <= now
      ).sort((a, b) => new Date(a.start_time).getTime() - new Date(a.start_time).getTime());
    } else {
      this.filteredBookings = this.bookings.filter(b => b.status === 'cancelled')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  }

  getStatusClass(booking: Booking): string {
    if (booking.status === 'cancelled') return 'cancelled';
    const now = new Date();
    const endTime = new Date(booking.end_time);
    const startTime = new Date(booking.start_time);
    
    if (endTime < now) return 'completed';
    if (startTime <= now && endTime >= now) return 'in-progress';
    return 'upcoming';
  }

  getStatusText(booking: Booking): string {
    if (booking.status === 'cancelled') return 'Cancelled';
    const now = new Date();
    const endTime = new Date(booking.end_time);
    const startTime = new Date(booking.start_time);
    
    if (endTime < now) return 'Completed';
    if (startTime <= now && endTime >= now) return 'In Progress';
    return 'Upcoming';
  }

  getStatusIcon(booking: Booking): string {
    if (booking.status === 'cancelled') return 'bi-x-circle-fill';
    const now = new Date();
    const endTime = new Date(booking.end_time);
    const startTime = new Date(booking.start_time);
    
    if (endTime < now) return 'bi-check-circle-fill';
    if (startTime <= now && endTime >= now) return 'bi-play-circle-fill';
    return 'bi-calendar-week';
  }

  canCancelBooking(booking: Booking): boolean {
    if (booking.status !== 'active') return false;
    
    const now = new Date();
    const startTime = new Date(booking.start_time);
    const hoursUntilBooking = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return hoursUntilBooking > 1;
  }

  getDuration(booking: Booking): string {
    const start = new Date(booking.start_time);
    const end = new Date(booking.end_time);
    const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    
    if (diffHours < 1) {
      const minutes = Math.round(diffHours * 60);
      return `${minutes} minutes`;
    }
    const hours = Math.floor(diffHours);
    const minutes = Math.round((diffHours - hours) * 60);
    if (minutes > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  }

  isUpcoming(booking: Booking): boolean {
    return new Date(booking.start_time) > new Date();
  }

  openCancelModal(booking: Booking): void {
    if (!this.canCancelBooking(booking)) {
      alert('Cannot cancel this booking. It must be more than 1 hour before start time.');
      return;
    }
    this.selectedBooking = booking;
    this.openModal('cancelBookingModal');
  }

  confirmCancel(): void {
    if (!this.selectedBooking) return;
    
    this.isCancelling = true;
    
    this.bookingService.cancelBooking(this.selectedBooking.id).subscribe({
      next: () => {
        this.isCancelling = false;
        this.closeModal('cancelBookingModal');
        this.loadBookings();
        this.showToast('Booking cancelled successfully!', 'success');
      },
      error: (err) => {
        console.error('Error cancelling booking:', err);
        this.isCancelling = false;
        this.showToast('Failed to cancel booking. Please try again.', 'error');
      }
    });
  }

  showToast(message: string, type: string): void {
    const toast = document.createElement('div');
    toast.className = `position-fixed bottom-0 end-0 p-3`;
    toast.style.zIndex = '11';
    const bgColor = type === 'success' ? '#28a745' : '#dc3545';
    toast.innerHTML = `
      <div class="toast show" role="alert">
        <div class="toast-header" style="background: ${bgColor}; color: white;">
          <i class="bi ${type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} me-2"></i>
          <strong class="me-auto">${type === 'success' ? 'Success' : 'Error'}</strong>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
        </div>
        <div class="toast-body">
          ${message}
        </div>
      </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  downloadICS(booking: Booking): void {
    const start = new Date(booking.start_time);
    const end = new Date(booking.end_time);
    
    const formatDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ReserveHub//Booking//EN
CALSCALE:GREGORIAN
BEGIN:VEVENT
UID:${booking.id}@reservehub.com
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(start)}
DTEND:${formatDate(end)}
SUMMARY:${booking.title || 'Resource Booking'}
DESCRIPTION:Resource: ${booking.resource?.name}\\nStart: ${start.toLocaleString()}\\nEnd: ${end.toLocaleString()}
LOCATION:${booking.resource?.name}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;
    
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `booking_${booking.id}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }

  openModal(modalId: string): void {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
      modalElement.classList.add('show');
      modalElement.style.display = 'block';
      document.body.classList.add('modal-open');
      
      let backdrop = document.querySelector('.modal-backdrop');
      if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop fade show';
        document.body.appendChild(backdrop);
      }
    }
  }

  closeModal(modalId: string): void {
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
      modalElement.classList.remove('show');
      modalElement.style.display = 'none';
      document.body.classList.remove('modal-open');
      
      const backdrop = document.querySelector('.modal-backdrop');
      if (backdrop) {
        backdrop.remove();
      }
      this.selectedBooking = null;
    }
  }
}