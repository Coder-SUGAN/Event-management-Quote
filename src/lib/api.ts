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
import {
  isSupabaseConfigured,
  supabaseProducts,
  supabaseCustomers,
  supabaseQuotations,
  supabaseBookings,
  supabaseInvoices,
  supabasePayments,
  supabaseSchedule,
} from './supabase.ts';
import {
  INITIAL_PRODUCTS,
  INITIAL_CUSTOMERS,
  INITIAL_TEMPLATES,
  INITIAL_QUOTATIONS,
  INITIAL_BOOKINGS,
} from '../data/seedData.ts';

/**
 * Universal safe API request wrapper that guarantees valid JSON responses
 * and provides clear, human-readable error messages instead of raw "Unexpected end of JSON input".
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

// ==========================================
// LOCAL STORAGE CACHE FALLBACK (for offline/Vercel preview before env keys)
// ==========================================
const LOCAL_STORAGE_PREFIX = 'kj4j_erp_';

function getLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, val: T): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_PREFIX + key, JSON.stringify(val));
  } catch (e) {
    console.warn('LocalStorage write warning:', e);
  }
}

const DEFAULT_TEMPLATES: CompanyTemplateSettings = {
  company_name: 'Kids Jump 4 Joy',
  tagline: "Sri Lanka's Premier Kids Party & Event Equipment Rentals",
  logo_url: '',
  address: 'No. 45, Station Road, Kurunegala, Sri Lanka',
  phone: '+94 77 123 4567 / +94 37 222 3456',
  whatsapp: '+94 77 123 4567',
  email: 'info@kidsjump4joy.com',
  reg_number: 'PV-102948',
  primary_color: '#e11d48',
  secondary_color: '#0284c7',
  quotation_header: 'OFFICIAL EVENT QUOTATION',
  quotation_terms: `1. A 50% advance deposit is required to confirm reservation. Dates are not reserved without deposit.
2. The remaining 50% balance must be settled prior to or upon delivery before equipment setup.
3. Client must ensure accessible 230V electric power source within 20m of setup location.
4. Setup area must be flat, free of sharp stones, debris, or overhead power lines.
5. In case of inclement weather, outdoor equipment must be powered down until dry for safety.`,
  payment_instructions: `Bank: Commercial Bank of Ceylon PLC
Account Name: Kids Jump 4 Joy (Pvt) Ltd
Account Number: 8009234567
Branch: Kurunegala Super Grade Branch
Please send deposit slip via WhatsApp to +94 77 123 4567 with Quotation Number.`,
  quotation_footer: 'Thank you for choosing Kids Jump 4 Joy! We bring boundless joy and unforgettable memories to your celebrations.',
  invoice_header: 'TAX INVOICE & OFFICIAL RECEIPT',
  invoice_terms: `1. All equipment delivered in good, tested, clean working condition.
2. The customer assumes full responsibility for equipment safety during the event period.
3. Damaged or lost accessories will be billed at replacement cost.`,
  invoice_footer: 'Kids Jump 4 Joy (Pvt) Ltd - Official Event Invoice. Thank you for your business!',
};

// ==========================================
// DASHBOARD & SEARCH
// ==========================================
export async function fetchStats(): Promise<DashboardStats> {
  if (isSupabaseConfigured()) {
    try {
      const [quotes, bookings, payments, schedule] = await Promise.all([
        supabaseQuotations.getAll(),
        supabaseBookings.getAll(),
        supabasePayments.getAll(),
        supabaseSchedule.getDaily(),
      ]);

      const todayStr = new Date().toISOString().split('T')[0];
      const todaysEvents = bookings.filter((b) => b.event_date === todayStr && b.status !== 'Cancelled').length;
      const upcomingEvents = bookings.filter((b) => b.event_date > todayStr && b.status !== 'Cancelled').length;
      const pendingQuotes = quotes.filter((q) => q.status === 'Draft' || q.status === 'Sent').length;
      const unpaidQuotes = quotes.filter((q) => q.status === 'Pending Payment' || q.status === 'Accepted').length;
      const confirmedBookings = bookings.filter((b) => b.status === 'Confirmed' || b.status === 'Upcoming').length;
      const todaysEquip = schedule.filter((s) => s.event_date === todayStr).reduce((acc, curr) => acc + curr.quantity, 0);

      const outstanding = bookings
        .filter((b) => b.status !== 'Cancelled')
        .reduce((sum, b) => sum + (b.balance || 0), 0);

      const currentMonth = todayStr.substring(0, 7);
      const monthlyRev = payments
        .filter((p) => p.payment_date && p.payment_date.startsWith(currentMonth))
        .reduce((sum, p) => sum + p.amount, 0);

      return {
        todays_events_count: todaysEvents,
        upcoming_events_count: upcomingEvents,
        pending_quotations_count: pendingQuotes,
        unpaid_quotations_count: unpaidQuotes,
        confirmed_bookings_count: confirmedBookings,
        todays_equipment_count: todaysEquip,
        outstanding_payments_amount: outstanding,
        monthly_revenue_amount: monthlyRev,
      };
    } catch (err) {
      console.warn('Direct Supabase fetchStats fallback:', err);
    }
  }

  // Fallback to server API or local calculation
  try {
    return await request<DashboardStats>('/api/stats');
  } catch {
    const quotes = getLocal<Quotation[]>('quotations', INITIAL_QUOTATIONS);
    const bookings = getLocal<Booking[]>('bookings', INITIAL_BOOKINGS);
    const payments = getLocal<Payment[]>('payments', []);
    return {
      todays_events_count: bookings.length,
      upcoming_events_count: bookings.length,
      pending_quotations_count: quotes.length,
      unpaid_quotations_count: 0,
      confirmed_bookings_count: bookings.length,
      todays_equipment_count: 0,
      outstanding_payments_amount: 0,
      monthly_revenue_amount: payments.reduce((acc, p) => acc + (p.amount || 0), 0),
    };
  }
}

export async function searchAll(query: string) {
  if (!query || query.trim().length === 0) {
    return { quotations: [], bookings: [], customers: [], products: [] };
  }

  if (isSupabaseConfigured()) {
    try {
      const q = query.toLowerCase().trim();
      const [quotes, bookings, customers, products] = await Promise.all([
        supabaseQuotations.getAll(),
        supabaseBookings.getAll(),
        supabaseCustomers.getAll(),
        supabaseProducts.getAll(),
      ]);

      return {
        quotations: quotes.filter(
          (item) =>
            item.customer_name?.toLowerCase().includes(q) ||
            item.quotation_number?.toLowerCase().includes(q) ||
            item.event_location?.toLowerCase().includes(q)
        ),
        bookings: bookings.filter(
          (item) =>
            item.customer_name?.toLowerCase().includes(q) ||
            item.booking_number?.toLowerCase().includes(q) ||
            item.event_location?.toLowerCase().includes(q)
        ),
        customers: customers.filter(
          (item) =>
            item.name?.toLowerCase().includes(q) ||
            item.phone?.includes(q) ||
            item.email?.toLowerCase().includes(q)
        ),
        products: products.filter(
          (item) =>
            item.name?.toLowerCase().includes(q) ||
            item.category?.toLowerCase().includes(q)
        ),
      };
    } catch (e) {
      console.warn('Search fallback error:', e);
    }
  }

  try {
    return await request<any>(`/api/search?q=${encodeURIComponent(query)}`);
  } catch {
    return { quotations: [], bookings: [], customers: [], products: [] };
  }
}

// ==========================================
// PRODUCTS / INVENTORY
// ==========================================
export async function fetchProducts(): Promise<Product[]> {
  if (isSupabaseConfigured()) {
    try {
      const products = await supabaseProducts.getAll();
      if (products && products.length > 0) {
        setLocal('products', products);
        return products;
      }
    } catch (err: any) {
      console.warn('Direct Supabase fetchProducts failed, falling back:', err);
    }
  }

  try {
    const products = await request<Product[]>('/api/products');
    if (products && products.length > 0) {
      setLocal('products', products);
      return products;
    }
  } catch {
    // Fallback to local cache/seed
  }

  return getLocal<Product[]>('products', INITIAL_PRODUCTS);
}

export async function createProduct(product: Partial<Product>): Promise<Product> {
  if (isSupabaseConfigured()) {
    return await supabaseProducts.create(product);
  }

  try {
    return await request<Product>('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
  } catch (err: any) {
    // If backend is unavailable (e.g. Vercel preview without server), save locally
    const existing = getLocal<Product[]>('products', []);
    const newProduct: Product = {
      id: `prod_${Date.now()}`,
      name: product.name || 'Equipment Item',
      category: product.category || 'General',
      total_quantity: Number(product.total_quantity || 1),
      unit_price: Number(product.unit_price || 0),
      additional_hourly_rate: Number(product.additional_hourly_rate || 0),
      description: product.description || '',
      dimensions: product.dimensions || '',
      power_required: product.power_required || '',
      status: product.status || 'active',
    };
    existing.push(newProduct);
    setLocal('products', existing);
    return newProduct;
  }
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
  if (isSupabaseConfigured()) {
    return await supabaseProducts.update(id, updates);
  }

  try {
    return await request<Product>(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
  } catch {
    const existing = getLocal<Product[]>('products', []);
    const idx = existing.findIndex((p) => p.id === id);
    if (idx !== -1) {
      existing[idx] = { ...existing[idx], ...updates };
      setLocal('products', existing);
      return existing[idx];
    }
    throw new Error('Product not found in storage');
  }
}

export async function deleteProduct(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    return await supabaseProducts.delete(id);
  }

  try {
    await request<void>(`/api/products/${id}`, { method: 'DELETE' });
  } catch {
    const existing = getLocal<Product[]>('products', []);
    setLocal('products', existing.filter((p) => p.id !== id));
  }
}

export async function checkEquipmentAvailability(date: string): Promise<ItemAvailability[]> {
  try {
    return await request<ItemAvailability[]>(`/api/availability?date=${encodeURIComponent(date)}`);
  } catch {
    const products = await fetchProducts();
    return products.map((p) => ({
      product: p,
      total_quantity: p.total_quantity,
      booked_quantity: 0,
      available_quantity: p.total_quantity,
      status: 'available',
    }));
  }
}

// ==========================================
// CUSTOMERS
// ==========================================
export async function fetchCustomers(): Promise<Customer[]> {
  if (isSupabaseConfigured()) {
    try {
      const customers = await supabaseCustomers.getAll();
      if (customers && customers.length > 0) {
        setLocal('customers', customers);
        return customers;
      }
    } catch (err) {
      console.warn('Direct Supabase fetchCustomers fallback:', err);
    }
  }

  try {
    const customers = await request<Customer[]>('/api/customers');
    if (customers && customers.length > 0) {
      setLocal('customers', customers);
      return customers;
    }
  } catch {
    // Fallback to local cache/seed
  }

  return getLocal<Customer[]>('customers', INITIAL_CUSTOMERS);
}

export async function createCustomer(customer: Partial<Customer>): Promise<Customer> {
  if (isSupabaseConfigured()) {
    return await supabaseCustomers.create(customer);
  }

  try {
    return await request<Customer>('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customer),
    });
  } catch {
    const existing = getLocal<Customer[]>('customers', []);
    const newCust: Customer = {
      id: `cust_${Date.now()}`,
      name: customer.name || 'New Customer',
      phone: customer.phone || '',
      whatsapp: customer.whatsapp || customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      notes: customer.notes || '',
      created_at: new Date().toISOString(),
    };
    existing.push(newCust);
    setLocal('customers', existing);
    return newCust;
  }
}

export async function updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
  if (isSupabaseConfigured()) {
    return await supabaseCustomers.update(id, updates);
  }

  try {
    return await request<Customer>(`/api/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
  } catch {
    const existing = getLocal<Customer[]>('customers', []);
    const idx = existing.findIndex((c) => c.id === id);
    if (idx !== -1) {
      existing[idx] = { ...existing[idx], ...updates };
      setLocal('customers', existing);
      return existing[idx];
    }
    throw new Error('Customer not found');
  }
}

// ==========================================
// QUOTATIONS
// ==========================================
export async function fetchQuotations(): Promise<Quotation[]> {
  if (isSupabaseConfigured()) {
    try {
      const quotes = await supabaseQuotations.getAll();
      if (quotes && quotes.length > 0) {
        setLocal('quotations', quotes);
        return quotes;
      }
    } catch (err) {
      console.warn('Direct Supabase fetchQuotations fallback:', err);
    }
  }

  try {
    const quotes = await request<Quotation[]>('/api/quotations');
    if (quotes && quotes.length > 0) {
      setLocal('quotations', quotes);
      return quotes;
    }
  } catch {
    // Fallback to local cache/seed
  }

  return getLocal<Quotation[]>('quotations', INITIAL_QUOTATIONS);
}

export async function createQuotation(data: any): Promise<Quotation> {
  if (isSupabaseConfigured()) {
    return await supabaseQuotations.create(data);
  }

  try {
    return await request<Quotation>('/api/quotations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch {
    const existing = getLocal<Quotation[]>('quotations', []);
    const newQuote: Quotation = {
      ...data,
      id: `quote_${Date.now()}`,
      quotation_number: `QT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      quote_number: `QT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: data.items || [],
    };
    existing.unshift(newQuote);
    setLocal('quotations', existing);
    return newQuote;
  }
}

export async function editQuotation(id: string, data: any): Promise<Quotation> {
  return request<Quotation>(`/api/quotations/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function updateQuotationStatus(id: string, status: string): Promise<Quotation> {
  if (isSupabaseConfigured()) {
    await supabaseQuotations.updateStatus(id, status);
  }
  return request<Quotation>(`/api/quotations/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
}

export async function duplicateQuotation(id: string): Promise<Quotation> {
  return request<Quotation>(`/api/quotations/${id}/duplicate`, {
    method: 'POST',
  });
}

export async function confirmBookingFromQuotation(quotationId: string, paymentData?: any): Promise<{ booking: Booking; invoice: Invoice }> {
  return request<{ booking: Booking; invoice: Invoice }>(`/api/quotations/${quotationId}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: paymentData ? JSON.stringify(paymentData) : undefined,
  });
}

// ==========================================
// BOOKINGS
// ==========================================
export async function fetchBookings(): Promise<Booking[]> {
  if (isSupabaseConfigured()) {
    try {
      const bookings = await supabaseBookings.getAll();
      if (bookings && bookings.length > 0) {
        setLocal('bookings', bookings);
        return bookings;
      }
    } catch (err) {
      console.warn('Direct Supabase fetchBookings fallback:', err);
    }
  }

  try {
    const bookings = await request<Booking[]>('/api/bookings');
    if (bookings && bookings.length > 0) {
      setLocal('bookings', bookings);
      return bookings;
    }
  } catch {
    // Fallback to local cache/seed
  }

  return getLocal<Booking[]>('bookings', INITIAL_BOOKINGS);
}

export async function updateBooking(id: string, updates: Partial<Booking>): Promise<Booking> {
  return request<Booking>(`/api/bookings/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
}

export async function cancelBooking(id: string, cancellationReason?: string): Promise<Booking> {
  return request<Booking>(`/api/bookings/${id}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cancellation_reason: cancellationReason }),
  });
}

export async function markBookingCompleted(id: string): Promise<Booking> {
  return request<Booking>(`/api/bookings/${id}/complete`, {
    method: 'POST',
  });
}

export async function generateInvoiceForBooking(bookingId: string): Promise<Invoice> {
  return request<Invoice>(`/api/bookings/${bookingId}/invoice`, {
    method: 'POST',
  });
}

// ==========================================
// PAYMENTS
// ==========================================
export async function fetchPayments(): Promise<Payment[]> {
  if (isSupabaseConfigured()) {
    try {
      const payments = await supabasePayments.getAll();
      setLocal('payments', payments);
      return payments;
    } catch (err) {
      console.warn('Direct Supabase fetchPayments fallback:', err);
    }
  }

  try {
    const payments = await request<Payment[]>('/api/payments');
    setLocal('payments', payments);
    return payments;
  } catch {
    return getLocal<Payment[]>('payments', []);
  }
}

export async function recordPayment(payment: {
  booking_id: string;
  amount: number;
  payment_method: string;
  payment_date?: string;
  transaction_reference?: string;
  payment_notes?: string;
  payment_proof_name?: string;
  payment_proof_url?: string;
  [key: string]: any;
}): Promise<Payment> {
  return request<Payment>('/api/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payment),
  });
}

// ==========================================
// INVOICES
// ==========================================
export async function fetchInvoices(): Promise<Invoice[]> {
  if (isSupabaseConfigured()) {
    try {
      const invoices = await supabaseInvoices.getAll();
      setLocal('invoices', invoices);
      return invoices;
    } catch (err) {
      console.warn('Direct Supabase fetchInvoices fallback:', err);
    }
  }

  try {
    const invoices = await request<Invoice[]>('/api/invoices');
    setLocal('invoices', invoices);
    return invoices;
  } catch {
    return getLocal<Invoice[]>('invoices', []);
  }
}

// ==========================================
// SCHEDULE
// ==========================================
export async function fetchDailySchedule(date?: string): Promise<DailyScheduleEntry[]> {
  if (isSupabaseConfigured()) {
    try {
      const schedule = await supabaseSchedule.getDaily();
      return date ? schedule.filter((s) => s.event_date === date) : schedule;
    } catch (err) {
      console.warn('Direct Supabase schedule fallback:', err);
    }
  }

  try {
    const url = date ? `/api/schedule/daily?date=${encodeURIComponent(date)}` : '/api/schedule/daily';
    return await request<DailyScheduleEntry[]>(url);
  } catch {
    return [];
  }
}

export function formatCurrency(amount?: number): string {
  const val = Number(amount || 0);
  return `Rs. ${val.toLocaleString('en-US')}`;
}

export function generateWhatsAppUrl(phone: string, text: string): string {
  const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : '';
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

export const fetchAvailability = checkEquipmentAvailability;

export async function fetchDailyEquipmentSummary(date: string): Promise<{ date: string; summary: any[] }> {
  try {
    return await request<{ date: string; summary: any[] }>(`/api/schedule/equipment-summary?date=${encodeURIComponent(date)}`);
  } catch {
    const items = await fetchDailySchedule(date);
    const summaryMap: Record<string, any> = {};
    for (const it of items) {
      if (!summaryMap[it.item_name]) {
        summaryMap[it.item_name] = { item_name: it.item_name, quantity: 0, bookings: [] };
      }
      summaryMap[it.item_name].quantity += it.quantity;
      summaryMap[it.item_name].bookings.push(it.booking_number);
    }
    return { date, summary: Object.values(summaryMap) };
  }
}

// ==========================================
// TEMPLATE SETTINGS
// ==========================================
export async function fetchTemplateSettings(): Promise<CompanyTemplateSettings> {
  try {
    return await request<CompanyTemplateSettings>('/api/templates');
  } catch {
    return getLocal<CompanyTemplateSettings>('templates', INITIAL_TEMPLATES);
  }
}

export async function updateTemplateSettings(settings: CompanyTemplateSettings): Promise<CompanyTemplateSettings> {
  setLocal('templates', settings);
  try {
    return await request<CompanyTemplateSettings>('/api/templates', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
  } catch {
    return settings;
  }
}
