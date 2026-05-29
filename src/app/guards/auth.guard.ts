import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean {
    const isLoggedIn = this.authService.isLoggedIn();
    console.log('AuthGuard - Is logged in:', isLoggedIn);
    
    if (!isLoggedIn) {
      this.router.navigate(['/resources']);
      return false;
    }
    
    return true;
  }
}