import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register-page.html'
})
export class RegisterComponent {
  userData = { username: '', email: '', password: '' };
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
    
    // Validate password length
    if (this.userData.password.length < 6) {
      this.error = 'Password must be at least 6 characters';
      this.loading = false;
      return;
    }
    
    console.log('Registering user:', this.userData.username);
    
    this.authService.register(this.userData).subscribe({
      next: () => {
        console.log('Registration successful');
        this.success = true;
        this.loading = false;
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (err) => {
        console.error('Registration error:', err);
        this.error = err.error?.detail || 'Registration failed. Username or email may already exist.';
        this.loading = false;
      }
    });
  }
}