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

/**
 * Universal safe API request wrapper that guarantees valid JSON responses
 * and provides clear error messages instead of raw "Unexpected end of JSON input".
 */
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, options);
  } catch (err: any) {
    throw new Error(
      `Network error: ${err?.message || 'Unable to communicate with the server. Please check your connection and try again.'}`
    );
  }

  let text = '';
  try {
    text = await res.text();
  } catch {
    text = '';
  }

  let data: any = null;
  if (text && text.trim().length > 0) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const errorMsg =
      data?.error ||
      data?.message ||
      (text && text.length < 150 && !text.includes('<') ? text : '') ||
      `Request failed (${res.status} ${res.statusText || 'Error'}). Please try again.`;
    throw new Error(errorMsg);
  }

  return (data as T) ?? ({} as T);
}

export async function fetchStats(): Promise<DashboardStats> {
  return request<DashboardStats>('/api/stats');
}

export async function searchAll(query: string) {
  return request<any>(`/api/search?q=${encodeURIComponent(query)}`);
}

export async function fetchProducts(): Promise<Product[]> {
  return request<Product[]>('/api/products');
}

export async function createProduct(product: Partial<Product>): Promise<Product> {
  return request<Product>('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product),
  });
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
  return request<Product>(`/api/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
}

export async function deleteProduct(id: string): Promise<{ success: boolean; id: string }> {
  return request<{ success: boolean; id: string }>(`/api/products/${id}`, {
    method: 'DELETE',
  });
}

export async function fetchAvailability(date: string): Promise<ItemAvailability[]> {
  return request<ItemAvailability[]>(`/api/availability?date=${encodeURIComponent(date)}`);
}

export async function fetchCustomers(): Promise<Customer[]> {
  return request<Customer[]>('/api/customers');
}

export async function createCustomer(cust: Partial<Customer>): Promise<Customer> {
  return request<Customer>('/api/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cust),
  });
}

export async function updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
  return request<Customer>(`/api/customers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
}

export async function fetchQuotations(): Promise<Quotation[]> {
  return request<Quotation[]>('/api/quotations');
}

export async function createQuotation(data: any): Promise<Quotation> {
  return request<Quotation>('/api/quotations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function editQuotation(id: string, data: any): Promise<Quotation> {
  return request<Quotation>(`/api/quotations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function duplicateQuotation(id: string): Promise<Quotation> {
  return request<Quotation>(`/api/quotations/${id}/duplicate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function updateQuotationStatus(id: string, status: string): Promise<Quotation> {
  return request<Quotation>(`/api/quotations/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

export async function confirmBookingFromQuotation(quotationId: string, paymentData?: any) {
  return request<any>(`/api/quotations/${quotationId}/confirm-booking`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paymentData || {}),
  });
}

export async function fetchBookings(): Promise<Booking[]> {
  return request<Booking[]>('/api/bookings');
}

export async function updateBooking(id: string, updates: Partial<Booking>): Promise<Booking> {
  return request<Booking>(`/api/bookings/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
}

export async function cancelBooking(id: string, reason?: string) {
  return request<any>(`/api/bookings/${id}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
}

export async function markBookingCompleted(id: string): Promise<Booking> {
  const data = await request<{ booking: Booking }>(`/api/bookings/${id}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return data.booking;
}

export async function generateInvoiceForBooking(id: string): Promise<Invoice> {
  const data = await request<{ invoice: Invoice }>(`/api/bookings/${id}/generate-invoice`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return data.invoice;
}

export async function fetchPayments(): Promise<Payment[]> {
  return request<Payment[]>('/api/payments');
}

export async function recordPayment(payment: any): Promise<Payment> {
  return request<Payment>('/api/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payment),
  });
}

export async function fetchInvoices(): Promise<Invoice[]> {
  return request<Invoice[]>('/api/invoices');
}

export async function fetchDailySchedule(date?: string): Promise<DailyScheduleEntry[]> {
  const url = date ? `/api/schedule/daily?date=${encodeURIComponent(date)}` : '/api/schedule/daily';
  return request<DailyScheduleEntry[]>(url);
}

export async function fetchDailyEquipmentSummary(date: string) {
  return request<any>(`/api/schedule/summary?date=${encodeURIComponent(date)}`);
}

export async function fetchTemplateSettings(): Promise<CompanyTemplateSettings> {
  return request<CompanyTemplateSettings>('/api/templates');
}

export async function updateTemplateSettings(settings: Partial<CompanyTemplateSettings>): Promise<CompanyTemplateSettings> {
  return request<CompanyTemplateSettings>('/api/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
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
