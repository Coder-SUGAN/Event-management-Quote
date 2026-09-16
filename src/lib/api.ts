import type {
  Customer,
  Product,
  Quotation,
  Booking,
  Payment,
  Invoice,
  DailyScheduleEntry,
  CompanyTemplateSettings,
  ItemAvailability,
  DashboardStats,
} from '../types.ts';

export async function fetchStats(): Promise<DashboardStats> {
  const res = await fetch('/api/stats');
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function searchAll(query: string) {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch('/api/products');
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

export async function createProduct(product: Partial<Product>): Promise<Product> {
  const res = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create product');
  }
  return res.json();
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
  const res = await fetch(`/api/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update product');
  }
  return res.json();
}

export async function fetchAvailability(date: string): Promise<ItemAvailability[]> {
  const res = await fetch(`/api/availability?date=${encodeURIComponent(date)}`);
  if (!res.ok) throw new Error('Failed to fetch availability');
  return res.json();
}

export async function fetchCustomers(): Promise<Customer[]> {
  const res = await fetch('/api/customers');
  if (!res.ok) throw new Error('Failed to fetch customers');
  return res.json();
}

export async function createCustomer(cust: Partial<Customer>): Promise<Customer> {
  const res = await fetch('/api/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cust),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create customer');
  }
  return res.json();
}

export async function updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
  const res = await fetch(`/api/customers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update customer');
  }
  return res.json();
}

export async function fetchQuotations(): Promise<Quotation[]> {
  const res = await fetch('/api/quotations');
  if (!res.ok) throw new Error('Failed to fetch quotations');
  return res.json();
}

export async function createQuotation(data: any): Promise<Quotation> {
  const res = await fetch('/api/quotations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create quotation');
  }
  return res.json();
}

export async function editQuotation(id: string, data: any): Promise<Quotation> {
  const res = await fetch(`/api/quotations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to edit quotation');
  }
  return res.json();
}

export async function duplicateQuotation(id: string): Promise<Quotation> {
  const res = await fetch(`/api/quotations/${id}/duplicate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to duplicate quotation');
  }
  return res.json();
}

export async function updateQuotationStatus(id: string, status: string): Promise<Quotation> {
  const res = await fetch(`/api/quotations/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update quotation status');
  }
  return res.json();
}

export async function confirmBookingFromQuotation(quotationId: string, paymentData?: any) {
  const res = await fetch(`/api/quotations/${quotationId}/confirm-booking`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paymentData || {}),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to confirm booking');
  }
  return res.json();
}

export async function fetchBookings(): Promise<Booking[]> {
  const res = await fetch('/api/bookings');
  if (!res.ok) throw new Error('Failed to fetch bookings');
  return res.json();
}

export async function updateBooking(id: string, updates: Partial<Booking>): Promise<Booking> {
  const res = await fetch(`/api/bookings/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update booking');
  }
  return res.json();
}

export async function cancelBooking(id: string, reason?: string) {
  const res = await fetch(`/api/bookings/${id}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to cancel booking');
  }
  return res.json();
}

export async function markBookingCompleted(id: string): Promise<Booking> {
  const res = await fetch(`/api/bookings/${id}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to mark booking as completed');
  }
  const data = await res.json();
  return data.booking;
}

export async function generateInvoiceForBooking(id: string): Promise<Invoice> {
  const res = await fetch(`/api/bookings/${id}/generate-invoice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to generate invoice');
  }
  const data = await res.json();
  return data.invoice;
}

export async function fetchPayments(): Promise<Payment[]> {
  const res = await fetch('/api/payments');
  if (!res.ok) throw new Error('Failed to fetch payments');
  return res.json();
}

export async function recordPayment(payment: any): Promise<Payment> {
  const res = await fetch('/api/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payment),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to record payment');
  }
  return res.json();
}

export async function fetchInvoices(): Promise<Invoice[]> {
  const res = await fetch('/api/invoices');
  if (!res.ok) throw new Error('Failed to fetch invoices');
  return res.json();
}

export async function fetchDailySchedule(date?: string): Promise<DailyScheduleEntry[]> {
  const url = date ? `/api/schedule/daily?date=${encodeURIComponent(date)}` : '/api/schedule/daily';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch schedule');
  return res.json();
}

export async function fetchDailyEquipmentSummary(date: string) {
  const res = await fetch(`/api/schedule/summary?date=${encodeURIComponent(date)}`);
  if (!res.ok) throw new Error('Failed to fetch summary');
  return res.json();
}

export async function fetchTemplateSettings(): Promise<CompanyTemplateSettings> {
  const res = await fetch('/api/templates');
  if (!res.ok) throw new Error('Failed to fetch template settings');
  return res.json();
}

export async function updateTemplateSettings(settings: Partial<CompanyTemplateSettings>): Promise<CompanyTemplateSettings> {
  const res = await fetch('/api/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update template settings');
  }
  return res.json();
}

export function formatCurrency(amount: number): string {
  return `Rs. ${Number(amount || 0).toLocaleString('en-LK')}`;
}

export function generateWhatsAppUrl(phone: string, message: string): string {
  // Clean phone number: remove spaces, plus sign, dashes
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export * from './pricing.ts';
