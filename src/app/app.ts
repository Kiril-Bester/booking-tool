import { Component, OnInit, HostListener } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { NgIf } from '@angular/common';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthService, User } from './services/auth.service';
import { AuthInterceptor } from './interceptors/auth.interceptor';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgIf],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
  templateUrl: './app.html'
})
export class AppComponent implements OnInit {
  currentUser: User | null = null;
  dropdownOpen = false;
  mobileMenuOpen = false;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    // Subscribe to user changes
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      console.log('App Component - User updated:', user);
    });

    // Check if we have a token but no user (page refresh)
    const token = localStorage.getItem('access_token');
    const user = this.authService.getCurrentUser();
    
    console.log('🚀 App Init - Token exists:', !!token);
    console.log('🚀 App Init - User exists:', !!user);
    
    if (token && !user) {
      console.log('🔄 Token found but no user, loading user...');
      this.authService.loadCurrentUser().subscribe({
        next: () => console.log('✅ User reloaded after refresh'),
        error: (err) => console.error('❌ Failed to reload user:', err)
      });
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Close dropdown if clicking outside
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown')) {
      this.dropdownOpen = false;
    }
  }

  toggleDropdown(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.dropdownOpen = !this.dropdownOpen;
    console.log('Dropdown toggled:', this.dropdownOpen);
  }

  closeDropdown(): void {
    this.dropdownOpen = false;
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  getCurrentUser(): User | null {
    return this.authService.getCurrentUser();
  }

  getUsername(): string {
    const user = this.getCurrentUser();
    return user?.username || '';
  }

  getInitials(): string {
    const user = this.getCurrentUser();
    if (!user?.username) return 'U';
    return user.username.substring(0, 2).toUpperCase();
  }

  getUserAvatarColor(): string {
    const colors = ['#4361ee', '#3a56d4', '#7209b7', '#f72585', '#4cc9f0', '#4895ef', '#560bad'];
    const username = this.getUsername();
    if (!username) return '#4361ee';
    const index = username.length % colors.length;
    return colors[index];
  }

  logout(): void {
    this.closeDropdown();
    this.authService.logout();
  }
}