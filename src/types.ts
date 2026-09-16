export type QuotationStatus = 
  | 'Draft' 
  | 'Sent' 
  | 'Customer Reviewing'
  | 'Changes Requested'
  | 'Revised'
  | 'Accepted' 
  | 'Rejected' 
  | 'Expired' 
  | 'Awaiting Payment' 
  | 'Paid' 
  | 'Converted to Booking';

export type BookingStatus = 
  | 'Confirmed' 
  | 'Upcoming' 
  | 'In Progress' 
  | 'Completed' 
  | 'Cancelled';

export type PaymentMethod = 
  | 'Bank Transfer' 
  | 'Cash' 
  | 'Online Payment' 
  | 'Other';

export type PaymentStatus = 
  | 'Unpaid' 
  | 'Partially Paid' 
  | 'Paid' 
  | 'Refunded';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  billing_details?: string;
  notes?: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  total_quantity: number;
  unit_price: number; // Base price for up to 3 hours
  additional_hourly_rate: number; // Additional rate per hour beyond 3 hours
  description?: string;
  dimensions?: string;
  power_required?: string;
  status: 'active' | 'maintenance';
}

export interface ItemAvailability {
  product: Product;
  total_quantity: number;
  booked_quantity: number;
  available_quantity: number;
  status: 'available' | 'limited' | 'not_available';
}

export interface LineItem {
  id: string;
  product_id: string;
  product_name_snapshot: string;
  quantity: number;
  unit_price: number; // Base rate for up to 3 hours
  base_price?: number; // Base rate for up to 3 hours
  additional_hourly_rate?: number; // Additional rate per hour beyond 3 hours
  additional_hours?: number; // Additional hours billed beyond 3 hours
  base_total?: number; // base_price * quantity
  additional_total?: number; // additional_hourly_rate * additional_hours * quantity
  discount: number;
  total: number;
  category?: string;
}

export interface QuotationVersion {
  version: number;
  created_at: string;
  created_by: string;
  change_summary: string;
  items: LineItem[];
  subtotal: number;
  delivery_fee: number;
  setup_fee: number;
  transport_fee: number;
  other_charges: number;
  discount: number;
  total_amount: number;
  deposit_required: number;
  remaining_balance: number;
  event_date: string;
  event_start_time: string;
  event_end_time: string;
  event_duration_minutes?: number;
  event_duration_formatted?: string;
  included_hours?: number;
  additional_hours?: number;
  event_location: string;
  event_type?: string;
  number_of_guests?: number;
  special_requirements?: string;
  notes?: string;
  terms_and_conditions?: string;
  status: QuotationStatus;
}

export interface Quotation {
  id: string;
  quotation_number: string;
  version: number;
  version_history?: QuotationVersion[];
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_whatsapp: string;
  customer_email: string;
  customer_address: string;
  event_date: string; // YYYY-MM-DD
  event_start_time: string; // HH:mm
  event_end_time: string; // HH:mm
  event_duration_minutes?: number;
  event_duration_formatted?: string;
  included_hours?: number;
  additional_hours?: number;
  event_location: string;
  event_type: string;
  number_of_guests: number;
  special_requirements: string;
  notes: string;
  terms_and_conditions?: string;
  items: LineItem[];
  subtotal: number;
  delivery_fee: number;
  setup_fee: number;
  transport_fee: number;
  other_charges: number;
  discount: number;
  total_amount: number;
  deposit_required: number;
  remaining_balance: number;
  status: QuotationStatus;
  valid_until: string;
  created_at: string;
  updated_at: string;
  converted_booking_id?: string;
}

export interface Booking {
  id: string;
  booking_number: string;
  quotation_id?: string;
  quotation_number?: string;
  accepted_quotation_version?: number;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_whatsapp: string;
  customer_email: string;
  customer_address: string;
  event_date: string;
  event_start_time: string;
  event_end_time: string;
  event_duration_minutes?: number;
  event_duration_formatted?: string;
  included_hours?: number;
  additional_hours?: number;
  event_location: string;
  event_type: string;
  number_of_guests: number;
  special_requirements: string;
  notes: string;
  items: LineItem[];
  subtotal: number;
  delivery_fee: number;
  setup_fee: number;
  transport_fee: number;
  other_charges: number;
  discount: number;
  total_amount: number;
  deposit_required: number;
  amount_paid: number;
  balance: number;
  status: BookingStatus;
  payment_status: PaymentStatus;
  invoice_number?: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  booking_id: string;
  booking_number: string;
  quotation_id?: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  transaction_reference: string;
  payment_notes: string;
  payment_proof_name?: string;
  payment_proof_data?: string;
  payment_status: PaymentStatus;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  booking_id: string;
  booking_number: string;
  quotation_id?: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_address: string;
  event_date: string;
  event_location: string;
  items: LineItem[];
  subtotal: number;
  delivery_fee: number;
  setup_fee: number;
  transport_fee: number;
  other_charges: number;
  discount: number;
  total: number;
  amount_paid: number;
  balance: number;
  payment_method: string;
  payment_date: string;
  status: 'Paid' | 'Partially Paid' | 'Unpaid';
  created_at: string;
}

export interface DailyScheduleEntry {
  id: string; // booking_id + '_' + product_id
  event_date: string;
  customer_name: string;
  customer_phone: string;
  location: string;
  product_id: string;
  item_name: string;
  quantity: number;
  start_time: string;
  end_time: string;
  booking_id: string;
  booking_number: string;
  status: BookingStatus;
  updated_at: string;
}

export interface CompanyTemplateSettings {
  company_name: string;
  tagline: string;
  logo_url: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  reg_number: string;
  primary_color: string;
  secondary_color: string;
  quotation_header: string;
  quotation_terms: string;
  payment_instructions: string;
  quotation_footer: string;
  invoice_header: string;
  invoice_terms: string;
  invoice_footer: string;
}

export interface DashboardStats {
  todays_events_count: number;
  upcoming_events_count: number;
  pending_quotations_count: number;
  unpaid_quotations_count: number;
  confirmed_bookings_count: number;
  todays_equipment_count: number;
  outstanding_payments_amount: number;
  monthly_revenue_amount: number;
}
