import { Routes } from '@angular/router';
import { ResourceListComponent } from '../app/pages/resource-list/resource-list';
import { BookingListComponent } from '../app/pages/booking-list/booking-list';
import { LoginComponent } from '../app/pages/login-page/login-page';
import { RegisterComponent } from '../app/pages/register-page/register-page';
import { AuthGuard } from '../app/guards/auth.guard';
import { DashboardComponent } from './dashboard/dashboard';

export const routes: Routes = [
  { path: '', redirectTo: '/resources', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'bookings', component: BookingListComponent, canActivate: [AuthGuard] },
  { path: 'resources', component: ResourceListComponent }
];