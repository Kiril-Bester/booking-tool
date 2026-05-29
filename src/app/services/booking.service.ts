import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Booking } from '../models/models';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class BookingService {
  private apiUrl = 'http://localhost:8000/api/bookings';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getMyBookings(status?: string): Observable<Booking[]> {
    const token = this.authService.getToken();
    if (!token) {
      console.error('No token available for bookings request');
      return new Observable(observer => observer.error('No token'));
    }
    
    const url = status 
      ? `${this.apiUrl}/${token}?status=${status}` 
      : `${this.apiUrl}/${token}`;
    return this.http.get<Booking[]>(url);
  }

  createBooking(booking: Partial<Booking>): Observable<Booking> {
    const token = this.authService.getToken();
    if (!token) {
      console.error('No token available for create booking');
      return new Observable(observer => observer.error('No token'));
    }
    
    const url = `${this.apiUrl}/${token}`;
    return this.http.post<Booking>(url, booking);
  }

  cancelBooking(id: number): Observable<any> {
    const token = this.authService.getToken();
    if (!token) {
      console.error('No token available for cancel booking');
      return new Observable(observer => observer.error('No token'));
    }
    
    const url = `${this.apiUrl}/${id}/${token}`;
    return this.http.delete(url);
  }

  getResourceBookings(resourceId: number, startDate?: string, endDate?: string): Observable<Booking[]> {
    let url = `${this.apiUrl}/resource/${resourceId}`;
    const params = [];
    if (startDate) params.push(`start_date=${startDate}`);
    if (endDate) params.push(`end_date=${endDate}`);
    if (params.length) url += '?' + params.join('&');
    console.log('📋 Fetching resource bookings for:', resourceId);
    return this.http.get<Booking[]>(url);
  }
}