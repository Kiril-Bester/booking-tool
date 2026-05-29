import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ResourceService } from '../../services/resource.service';
import { Resource } from '../../models/models';

@Component({
  selector: 'app-resource-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './resource-form.html'
})
export class ResourceFormComponent implements OnInit {
  @Input() resource?: Resource | null;
  @Output() saved = new EventEmitter<void>();
  
  formData: any = {};
  isEdit = false;
  isSubmitting = false;
  submitted = false;
  
  days = [
    { label: 'Monday', value: 'MON', short: 'Mon' },
    { label: 'Tuesday', value: 'TUE', short: 'Tue' },
    { label: 'Wednesday', value: 'WED', short: 'Wed' },
    { label: 'Thursday', value: 'THU', short: 'Thu' },
    { label: 'Friday', value: 'FRI', short: 'Fri' },
    { label: 'Saturday', value: 'SAT', short: 'Sat' },
    { label: 'Sunday', value: 'SUN', short: 'Sun' }
  ];
  
  selectedDays: string[] = [];

  constructor(private resourceService: ResourceService) {}

  ngOnInit(): void {
    if (this.resource) {
      this.isEdit = true;
      this.formData = { ...this.resource };
      // Convert time strings to proper format for time input
      if (this.formData.availability_start && typeof this.formData.availability_start === 'string') {
        this.formData.availability_start = this.formData.availability_start.substring(0, 5);
      }
      if (this.formData.availability_end && typeof this.formData.availability_end === 'string') {
        this.formData.availability_end = this.formData.availability_end.substring(0, 5);
      }
      this.selectedDays = this.formData.availability_days?.split(',') || [];
    } else {
      this.formData = {
        name: '',
        description: '',
        availability_start: '09:00',
        availability_end: '17:00',
        availability_days: 'MON,TUE,WED,THU,FRI'
      };
      this.selectedDays = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
    }
  }

  toggleDay(day: string): void {
    const index = this.selectedDays.indexOf(day);
    if (index > -1) {
      this.selectedDays.splice(index, 1);
    } else {
      this.selectedDays.push(day);
    }
    this.formData.availability_days = this.selectedDays.join(',');
  }

  isDaySelected(day: string): boolean {
    return this.selectedDays.includes(day);
  }

  getSelectedDaysText(): string {
    if (this.selectedDays.length === 0) return 'no days';
    if (this.selectedDays.length === 7) return 'every day';
    
    const dayNames = this.selectedDays.map(day => {
      const found = this.days.find(d => d.value === day);
      return found ? found.short : day;
    });
    
    if (dayNames.length === 5 && 
        dayNames.includes('Mon') && dayNames.includes('Tue') && 
        dayNames.includes('Wed') && dayNames.includes('Thu') && dayNames.includes('Fri')) {
      return 'weekdays';
    }
    
    return dayNames.join(', ');
  }

  onSubmit(): void {
    this.submitted = true;
    
    if (!this.formData.name || !this.formData.availability_start || !this.formData.availability_end) {
      return;
    }
    
    this.isSubmitting = true;
    
    const request = this.isEdit
      ? this.resourceService.updateResource(this.formData.id, this.formData)
      : this.resourceService.createResource(this.formData);
    
    request.subscribe({
      next: () => {
        this.isSubmitting = false;
        this.saved.emit();
      },
      error: (err) => {
        this.isSubmitting = false;
        const errorMessage = err.error?.detail || 'Failed to save resource. Please try again.';
        alert(errorMessage);
      }
    });
  }
}