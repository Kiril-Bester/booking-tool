export interface User {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  created_at: string;
}

export interface Resource {
  id: number;
  name: string;
  description: string;
  availability_start: string;
  availability_end: string;
  availability_days: string;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: number;
  resource_id: number;
  user_id: number;
  title: string;
  start_time: string;
  end_time: string;
  status: 'active' | 'cancelled';
  created_at: string;
  cancelled_at?: string;
  resource?: Resource;
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

export interface AuthResponse {
  access_token: string;
  token_type: string;
}