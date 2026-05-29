import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login-page.html'
})
export class LoginComponent {
  credentials = { username: '', password: '' };
  loading = false;
  error = '';
  success = false;

  constructor(
    private authService: AuthService, 
    private router: Router
  ) {}

  onSubmit(): void {
    this.loading = true;
    this.error = '';
    this.success = false;
    
    console.log('🚀 Login submitted for:', this.credentials.username);
    
    this.authService.login(this.credentials).subscribe({
      next: (response) => {
        console.log('✅ Login successful!');
        console.log('Token received');
        
        this.success = true;
        
        // The user data is loaded inside the login method
        // After user data is loaded, redirect to dashboard
        // We'll wait a bit for the user data to be fully loaded
        setTimeout(() => {
          // Check if user data is available
          const user = this.authService.getCurrentUser();
          if (user) {
            console.log('✅ User data loaded, redirecting to dashboard:', user.username);
            this.router.navigate(['/dashboard']);
          } else {
            console.log('⚠️ User data not yet loaded, waiting...');
            // Try again after another short delay
            setTimeout(() => {
              const userRetry = this.authService.getCurrentUser();
              if (userRetry) {
                console.log('✅ User data loaded on retry, redirecting to dashboard');
                this.router.navigate(['/dashboard']);
              } else {
                console.error('❌ User data still not loaded, redirecting to resources');
                this.router.navigate(['/resources']);
              }
            }, 1000);
          }
        }, 1500);
      },
      error: (err) => {
        console.error('❌ Login failed:', err);
        this.error = err.error?.detail || 'Invalid username or password';
        this.loading = false;
      }
    });
  }
}