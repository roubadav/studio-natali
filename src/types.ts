// Cloudflare Worker Environment Bindings
export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  APP_URL: string;
  RESEND_API_KEY?: string;
}

// Database Types
export interface User {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  slug: string;
  role: 'user' | 'admin' | 'superadmin';
  bio: string | null;
  phone: string | null;
  image: string | null;
  color: string;
  notification_email: string | null;
  notification_phone: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface ServiceCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  created_at: string;
}

export interface Service {
  id: number;
  user_id: number;
  category_id: number | null;
  name: string;
  description: string | null;
  price: number;
  price_type: 'fixed' | 'starts_at' | 'hourly' | 'consultation';
  duration: number;
  is_active: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ServiceWithCategory extends Service {
  category_name: string | null;
  category_slug: string | null;
  category_icon: string | null;
}

export interface WorkingHoursTemplate {
  id: number;
  user_id: number;
  day_of_week: number;
  start_time: string | null;
  end_time: string | null;
  break_start: string | null;
  break_end: string | null;
  is_day_off: number;
  is_working?: boolean; // Alias for compatibility
  created_at: string;
}

export interface WorkingHoursOverride {
  id: number;
  user_id: number;
  date: string;
  start_time: string | null;
  end_time: string | null;
  break_start: string | null;
  break_end: string | null;
  is_day_off: number;
  note: string | null;
  created_at: string;
}

export interface Reservation {
  id: number;
  user_id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'approved' | 'confirmed' | 'cancelled' | 'completed' | 'no_show' | 'locked';
  workflow_step: string;
  lock_expires_at: string | null;
  lock_token: string | null;
  total_price: number | null;
  total_duration: number | null;
  note: string | null;
  management_token: string | null;
  cancellation_reason: string | null;
  terms_accepted: number;
  email_verified: number;
  created_at: string;
  updated_at: string;
}

export interface ReservationItem {
  id: number;
  reservation_id: number;
  service_id: number;
  price_at_time: number;
  duration_at_time: number;
  quantity: number;
}

export interface ReservationItemWithService extends ReservationItem {
  service_name: string;
}

export interface ReservationWithItems extends Reservation {
  items: ReservationItemWithService[];
  worker_name?: string;
}

export interface Setting {
  key: string;
  value: string;
  description: string | null;
  category: string;
  updated_at: string;
}

export interface GalleryImage {
  id: number;
  url: string;
  alt_text: string | null;
  slot_index: number | null;
  updated_at: string;
}

export interface BlockedSlot {
  id: number;
  user_id: number;
  date: string;
  start_time: string;
  end_time: string;
  note: string | null;
  created_at: string;
}

// JWT Payload
export interface JWTPayload {
  userId: number;
  email: string;
  role: string;
  exp: number;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Slot Status
export interface SlotStatus {
  time: string;
  status: 'available' | 'too_short' | 'pending' | 'busy';
  label?: string;
}
