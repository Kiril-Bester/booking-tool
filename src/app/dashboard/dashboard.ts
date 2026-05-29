import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService, User } from '../services/auth.service';
import { BookingService } from '../services/booking.service';
import { ResourceService } from '../services/resource.service';
import { BookingFormComponent } from '../pages/booking-form/booking-form';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, BookingFormComponent],
  templateUrl: './dashboard.html'
})
export class DashboardComponent implements OnInit {
  currentUser: User | null = null;
  recentBookings: any[] = [];
  resources: any[] = [];
  selectedResourceId: number | undefined;
  selectedBooking: any = null;
  isAdmin = false;
  isLoading = true;
  hasBookings = false;
  isCancelling = false;
  
  stats = {
    totalBookings: 0,
    activeBookings: 0,
    upcomingBookings: 0,
    cancelledBookings: 0,
    pastBookings: 0,
    totalResources: 0
  };

  constructor(
    private authService: AuthService,
    private bookingService: BookingService,
    private resourceService: ResourceService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUserData();
  }

  loadUserData(): void {
    console.log('📊 Dashboard loading user data...');
    
    this.currentUser = this.authService.getCurrentUser();
    
    if (!this.currentUser) {
      console.error('No user found! Redirecting to login...');
      this.router.navigate(['/login']);
      return;
    }
    
    console.log('✅ Dashboard - Current user:', this.currentUser);
    this.isAdmin = this.authService.isAdmin();
    this.loadStats();
  }

  getBookingStatus(booking: any): string {
    if (booking.status === 'cancelled') return 'cancelled';
    
    const now = new Date();
    const startTime = new Date(booking.start_time);
    const endTime = new Date(booking.end_time);
    
    if (now > endTime) return 'completed';
    if (now >= startTime && now <= endTime) return 'active';
    if (now < startTime) return 'upcoming';
    
    return booking.status || 'active';
  }

  getStatusBadgeClass(status: string): string {
    switch(status) {
      case 'upcoming':
        return 'bg-info text-white';
      case 'active':
        return 'bg-success text-white';
      case 'completed':
        return 'bg-secondary text-white';
      case 'cancelled':
        return 'bg-warning text-dark';
      default:
        return 'bg-secondary text-white';
    }
  }

  getStatusIcon(status: string): string {
    switch(status) {
      case 'upcoming':
        return 'bi-calendar-week';
      case 'active':
        return 'bi-play-circle-fill';
      case 'completed':
        return 'bi-check-circle-fill';
      case 'cancelled':
        return 'bi-x-circle-fill';
      default:
        return 'bi-calendar-check';
    }
  }

  loadStats(): void {
    this.isLoading = true;
    
    this.bookingService.getMyBookings().subscribe({
      next: (bookings) => {
        console.log('📋 Bookings loaded:', bookings);
        
        const now = new Date();
        
        // Enhance bookings with status
        const enhancedBookings = bookings.map(booking => ({
          ...booking,
          displayStatus: this.getBookingStatus(booking)
        }));
        
        const sortedBookings = [...enhancedBookings].sort((a, b) => 
          new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
        );
        
        this.recentBookings = sortedBookings.slice(0, 5);
        this.hasBookings = this.recentBookings.length > 0;
        
        // Calculate stats
        this.stats.totalBookings = bookings.length;
        this.stats.cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;
        this.stats.activeBookings = bookings.filter(b => 
          b.status === 'active' && new Date(b.start_time) <= now && new Date(b.end_time) >= now
        ).length;
        this.stats.upcomingBookings = bookings.filter(b => 
          b.status === 'active' && new Date(b.start_time) > now
        ).length;
        this.stats.pastBookings = bookings.filter(b => 
          b.status === 'active' && new Date(b.end_time) < now
        ).length;
        
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading bookings:', err);
        this.isLoading = false;
      }
    });
    
    this.resourceService.getResources().subscribe({
      next: (resources) => {
        this.resources = resources;
        this.stats.totalResources = resources.length;
      },
      error: (err) => {
        console.error('Error loading resources:', err);
      }
    });
  }

  canCancelBooking(booking: any): boolean {
    if (booking.status !== 'active') return false;
    
    const now = new Date();
    const startTime = new Date(booking.start_time);
    const hoursUntilBooking = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return hoursUntilBooking > 1;
  }

  getCancelMessage(booking: any): string {
    if (booking.status !== 'active') return 'Already cancelled';
    
    const now = new Date();
    const startTime = new Date(booking.start_time);
    const hoursUntilBooking = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilBooking <= 0) return 'Booking has already started';
    if (hoursUntilBooking <= 1) return 'Cannot cancel within 1 hour of booking';
    
    const hoursLeft = Math.floor(hoursUntilBooking);
    const minutesLeft = Math.floor((hoursUntilBooking - hoursLeft) * 60);
    
    if (hoursLeft > 0) {
      return `Cancel available (${hoursLeft}h ${minutesLeft}m remaining)`;
    }
    return `Cancel available (${minutesLeft}m remaining)`;
  }

  openCancelModal(booking: any): void {
    if (!this.canCancelBooking(booking)) {
      alert(this.getCancelMessage(booking));
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
        this.loadStats();
        this.showSuccessToast('Booking cancelled successfully!');
      },
      error: (err) => {
        console.error('Error cancelling booking:', err);
        this.isCancelling = false;
        alert('Failed to cancel booking. Please try again.');
      }
    });
  }

  showSuccessToast(message: string): void {
    const toast = document.createElement('div');
    toast.className = 'position-fixed bottom-0 end-0 p-3';
    toast.style.zIndex = '11';
    toast.innerHTML = `
      <div class="toast show" role="alert">
        <div class="toast-header bg-success text-white">
          <i class="bi bi-check-circle-fill me-2"></i>
          <strong class="me-auto">Success</strong>
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

  navigateTo(route: string): void {
    this.router.navigate([`/${route}`]);
  }

  quickBook(): void {
    if (this.resources.length > 0) {
      this.selectedResourceId = this.resources[0].id;
      this.openModal('quickBookingModal');
    } else {
      alert('No resources available for booking');
    }
  }

  viewAllBookings(): void {
    this.router.navigate(['/bookings']);
  }

  manageResources(): void {
    this.router.navigate(['/resources']);
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

  onBookingCreated(): void {
    this.closeModal('quickBookingModal');
    this.loadStats();
    this.showSuccessToast('Booking created successfully!');
  }
}