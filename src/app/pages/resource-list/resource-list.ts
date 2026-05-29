import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ResourceService } from '../../services/resource.service';
import { AuthService } from '../../services/auth.service';
import { BookingService } from '../../services/booking.service';
import { ResourceFormComponent } from '../resource-form/resource-form';
import { BookingFormComponent } from '../booking-form/booking-form';
import { Resource, Booking } from '../../models/models';
import { Router } from '@angular/router';

@Component({
  selector: 'app-resource-list',
  standalone: true,
  imports: [CommonModule, FormsModule, ResourceFormComponent, BookingFormComponent],
  templateUrl: './resource-list.html'
})
export class ResourceListComponent implements OnInit {
  resources: Resource[] = [];
  filteredResources: Resource[] = [];
  searchTerm = '';
  dayFilter = '';
  viewMode: 'grid' | 'list' = 'grid';
  selectedResource: Resource | null = null;
  selectedResourceIdForBooking: number | undefined = undefined;
  isEditMode = false;
  resourceBookings: Booking[] = [];
  isLoading = true;
  isLoadingBookings = false;
  errorMessage = '';
  isLoggedIn = false;

  // Demo resources for non-logged in users
  demoResources: Resource[] = [
    {
      id: 1,
      name: 'Conference Room A',
      description: 'Large conference room with projector, whiteboard, and video conferencing capabilities. Perfect for team meetings and presentations. Capacity: 20 people.',
      availability_start: '08:00',
      availability_end: '18:00',
      availability_days: 'MON,TUE,WED,THU,FRI',
      created_at: '',
      updated_at: ''
    } as Resource,
    {
      id: 2,
      name: 'Meeting Room B',
      description: 'Small meeting room ideal for 4-6 people. Includes whiteboard and TV screen with HDMI connection. Quiet and private.',
      availability_start: '09:00',
      availability_end: '17:00',
      availability_days: 'MON,TUE,WED,THU,FRI',
      created_at: '',
      updated_at: ''
    } as Resource,
    {
      id: 3,
      name: 'Workshop Machine',
      description: 'Professional 3D printer and laser cutter. Includes training session for first-time users. Materials available for purchase.',
      availability_start: '10:00',
      availability_end: '20:00',
      availability_days: 'MON,TUE,WED,THU,FRI,SAT',
      created_at: '',
      updated_at: ''
    } as Resource,
    {
      id: 4,
      name: 'Pool Vehicle',
      description: 'Electric car for business trips and errands. Includes charging cable and full insurance coverage. Mileage included.',
      availability_start: '07:00',
      availability_end: '22:00',
      availability_days: 'MON,TUE,WED,THU,FRI,SAT,SUN',
      created_at: '',
      updated_at: ''
    } as Resource,
    {
      id: 5,
      name: 'VR Lab',
      description: 'Virtual reality setup with latest equipment including Oculus Quest 2. Great for testing, demonstrations, and immersive experiences.',
      availability_start: '11:00',
      availability_end: '19:00',
      availability_days: 'MON,WED,FRI',
      created_at: '',
      updated_at: ''
    } as Resource,
    {
      id: 6,
      name: 'Recording Studio',
      description: 'Professional audio recording studio with soundproofing, mixing equipment, and high-quality microphones. Perfect for podcasts and voice overs.',
      availability_start: '09:00',
      availability_end: '21:00',
      availability_days: 'TUE,THU,SAT',
      created_at: '',
      updated_at: ''
    } as Resource
  ];

  constructor(
    private resourceService: ResourceService,
    private authService: AuthService,
    private bookingService: BookingService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.checkLoginStatus();
  }

  checkLoginStatus(): void {
    this.isLoggedIn = this.authService.isLoggedIn();

    if (this.isLoggedIn) {
      this.loadResources();
    } else {
      this.isLoading = false;
      this.resources = this.demoResources;
      this.filteredResources = this.demoResources;
    }
  }

  loadResources(): void {
    this.isLoading = true;
    console.log('Loading real resources from API...');
    
    this.resourceService.getResources().subscribe({
      next: (data) => {        
        this.resources = data;
        this.filteredResources = data;
        this.isLoading = false;
        this.errorMessage = '';
      },
      error: (err) => {
        this.errorMessage = 'Failed to load resources. Please try again later.';
        this.isLoading = false;
      }
    });
  }

  filterResources(): void {
    this.filteredResources = this.resources.filter(resource => {
      const matchesSearch = resource.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                           (resource.description?.toLowerCase().includes(this.searchTerm.toLowerCase()) || false);
      const matchesDay = !this.dayFilter || resource.availability_days.includes(this.dayFilter);
      return matchesSearch && matchesDay;
    });
  }

  refreshResources(): void {
    if (this.isLoggedIn) {
      this.loadResources();
    }
  }

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  isResourceAvailable(resource: Resource): boolean {
    const now = new Date();
    const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const currentDay = days[now.getDay()];
    const currentTime = now.toTimeString().slice(0, 5);
    
    return resource.availability_days.includes(currentDay) &&
           currentTime >= resource.availability_start &&
           currentTime <= resource.availability_end;
  }

  selectResource(resource: Resource): void {
    if (!this.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }
    this.selectedResource = resource;
    this.selectedResourceIdForBooking = resource.id;
  }

  openModal(modalId: string): void {
    if (!this.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }
    
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
    }
  }

  openCreateModal(): void {
    if (!this.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }
    this.isEditMode = false;
    this.selectedResource = null;
    this.openModal('resourceFormModal');
  }

  editResource(resource: Resource): void {
    if (!this.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }
    this.isEditMode = true;
    this.selectedResource = resource;
    this.openModal('resourceFormModal');
  }

  deleteResource(id: number): void {
    if (confirm('Are you sure you want to delete this resource?')) {
      this.resourceService.deleteResource(id).subscribe({
        next: () => {
          this.loadResources();
          alert('Resource deleted successfully!');
        },
        error: (err) => {
          alert('Failed to delete resource');
        }
      });
    }
  }

  bookResource(resource: Resource): void {    
    if (!this.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }
    
    this.selectedResource = resource;
    this.selectedResourceIdForBooking = resource.id;
    this.openModal('bookingModal');
  }

  viewBookings(resource: Resource): void {
    if (!this.isLoggedIn) {
      this.router.navigate(['/login']);
      return;
    }
    this.selectedResource = resource;
    this.isLoadingBookings = true;
    this.openModal('viewBookingsModal');
    
    this.bookingService.getResourceBookings(resource.id).subscribe({
      next: (bookings) => {
        this.resourceBookings = bookings;
        this.isLoadingBookings = false;
      },
      error: (err) => {
        console.error('Failed to load bookings:', err);
        this.isLoadingBookings = false;
        alert('Failed to load bookings');
      }
    });
  }

  getActiveBookingsCount(): number {
    return this.resourceBookings.filter(b => b.status === 'active').length;
  }

  getUpcomingBookingsCount(): number {
    const now = new Date();
    return this.resourceBookings.filter(b => 
      b.status === 'active' && new Date(b.start_time) > now
    ).length;
  }

  isUpcomingBooking(booking: Booking): boolean {
    return booking.status === 'active' && new Date(booking.start_time) > new Date();
  }

  isOngoingBooking(booking: Booking): boolean {
    const now = new Date();
    const start = new Date(booking.start_time);
    const end = new Date(booking.end_time);
    return booking.status === 'active' && now >= start && now <= end;
  }

  isPastBooking(booking: Booking): boolean {
    return booking.status === 'active' && new Date(booking.end_time) < new Date();
  }

  getBookingStatusText(booking: Booking): string {
    if (booking.status === 'cancelled') return 'Cancelled';
    if (this.isUpcomingBooking(booking)) return 'Upcoming';
    if (this.isOngoingBooking(booking)) return 'In Progress';
    if (this.isPastBooking(booking)) return 'Completed';
    return booking.status;
  }

  getBookingDuration(booking: Booking): string {
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

  getCurrentUserId(): number {
    return this.authService.getCurrentUser()?.id || 0;
  }

  onResourceSaved(): void {
    this.loadResources();
    this.closeModal('resourceFormModal');
  }

  onBookingCreated(): void {
    this.closeModal('bookingModal');
    alert('Booking created successfully!');
  }

  closeViewBookingsModal(): void {
    this.closeModal('viewBookingsModal');
    this.resourceBookings = [];
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  scrollToResources(): void {
    const element = document.getElementById('resources-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  formatDays(daysString: string): string {
    const daysMap: { [key: string]: string } = {
      'MON': 'Mon', 'TUE': 'Tue', 'WED': 'Wed', 'THU': 'Thu',
      'FRI': 'Fri', 'SAT': 'Sat', 'SUN': 'Sun'
    };
    
    const days = daysString.split(',');
    if (days.length === 7) return 'Every day';
    if (days.length === 5 && days.join(',').includes('MON,TUE,WED,THU,FRI')) return 'Weekdays';
    
    return days.map(d => daysMap[d] || d).join(', ');
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.dayFilter = '';
    this.filterResources();
  }

  getUsername(): string {
    return this.authService.getCurrentUser()?.username || '';
  }
}