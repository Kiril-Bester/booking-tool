import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService, private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getToken();
    
    // Log request details
    console.log('🔄 Interceptor - URL:', req.url);
    console.log('🔄 Interceptor - Method:', req.method);
    console.log('🔄 Interceptor - Token exists:', !!token);
    
    // Skip adding token to login and register endpoints
    const isAuthEndpoint = req.url.includes('/token') || req.url.includes('/register');
    
    if (token && !isAuthEndpoint) {
      console.log('🔄 Interceptor - Adding Authorization header');
      const authReq = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${token}`)
      });
      return next.handle(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('🔄 Interceptor - Error:', error.status, error.statusText);
          if (error.status === 401) {
            console.log('🔄 Interceptor - 401 Unauthorized, redirecting to login');
            this.authService.logout();
            this.router.navigate(['/login']);
          }
          return throwError(() => error);
        })
      );
    }
    
    console.log('🔄 Interceptor - No token added (auth endpoint or no token)');
    return next.handle(req);
  }
}