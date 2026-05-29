import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface User {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8000';
  private tokenKey = 'access_token';
  private userKey = 'user_data';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  
  // Public observable for components to subscribe to
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    this.checkStoredToken();
  }

  private checkStoredToken(): void {
    const token = localStorage.getItem(this.tokenKey);
    const userData = localStorage.getItem(this.userKey);
    
    console.log('🔍 Checking stored token...');
    console.log('Token exists:', !!token);
    console.log('User data exists:', !!userData);
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        this.currentUserSubject.next(user);
        console.log('✅ User restored:', user.username);
      } catch (e) {
        console.error('Error parsing user data:', e);
        this.logout();
      }
    }
  }

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    const formData = new FormData();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);
    
    console.log('📝 Login attempt for:', credentials.username);
    
    return this.http.post<AuthResponse>(`${this.apiUrl}/api/users/token`, formData).pipe(
      tap({
        next: (response) => {
          console.log('✅ Login API call successful!');
          console.log('Token received:', response.access_token.substring(0, 50) + '...');
          
          // Save token
          localStorage.setItem(this.tokenKey, response.access_token);
          console.log('💾 Token saved to localStorage');
          
          // Load user data immediately after token is saved
          this.loadCurrentUser().subscribe({
            next: (user) => {
              console.log('✅✅ User data successfully loaded!');
              console.log('User details:', user);
            },
            error: (err) => {
              console.error('❌ Failed to load user data after login:', err);
            }
          });
        },
        error: (err) => {
          console.error('❌ Login API call failed:', err);
        }
      })
    );
  }

  loadCurrentUser(): Observable<User> {
    const token = this.getToken();
    console.log('👤 Loading current user from /me endpoint...');
    console.log('Token for request:', !!token);
    
    if (!token) {
      console.error('No token available for user request');
      return new Observable(observer => {
        observer.error('No token');
      });
    }
    
    // Pass token as path parameter
    return this.http.get<User>(`${this.apiUrl}/api/users/me/${token}`).pipe(
      tap({
        next: (user) => {
          console.log('✅ User data received from API:', user);
          // Store user data
          localStorage.setItem(this.userKey, JSON.stringify(user));
          this.currentUserSubject.next(user);
          console.log('💾 User data saved to localStorage');
          console.log('👤 User subject updated');
        },
        error: (err) => {
          console.error('❌ Failed to load user:', err);
          if (err.status === 401) {
            console.log('Unauthorized - logging out');
            this.logout();
          }
        }
      })
    );
  }

  register(data: RegisterData): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/api/users/register`, data);
  }

  getToken(): string | null {
    const token = localStorage.getItem(this.tokenKey);
    console.log('🔑 getToken() - Token exists:', !!token);
    return token;
  }

  getCurrentUser(): User | null {
    const user = this.currentUserSubject.value;
    console.log('👤 getCurrentUser():', user ? user.username : 'No user logged in');
    return user;
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    const isLoggedIn = !!token;
    console.log('🔐 isLoggedIn():', isLoggedIn);
    return isLoggedIn;
  }

  isAdmin(): boolean {
    const isAdmin = this.currentUserSubject.value?.is_admin || false;
    console.log('👑 isAdmin():', isAdmin);
    return isAdmin;
  }

  logout(): void {
    console.log('🚪 Logging out...');
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.currentUserSubject.next(null);
    // Redirect to resources page (demo mode)
    this.router.navigate(['/resources']);
  }
}