import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  Product,
  Customer,
  Quotation,
  Booking,
  Invoice,
  Payment,
  DailyScheduleEntry,
  CompanyTemplateSettings,
} from '../types.ts';

// Read public credentials from Vite client environment or localStorage override
const envSupabaseUrl =
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  (import.meta as any).env?.SUPABASE_URL ||
  '';
const envSupabaseAnonKey =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  (import.meta as any).env?.SUPABASE_ANON_KEY ||
  '';

export const isSupabaseConfigured = (): boolean => {
  return (
    typeof envSupabaseUrl === 'string' &&
    envSupabaseUrl.trim().length > 0 &&
    envSupabaseUrl.startsWith('http') &&
    typeof envSupabaseAnonKey === 'string' &&
    envSupabaseAnonKey.trim().length > 0 &&
    !envSupabaseUrl.includes('placeholder')
  );
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(envSupabaseUrl.trim(), envSupabaseAnonKey.trim(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * Checks if an error is due to a missing table in the PostgREST / Supabase schema cache
 */
export function isTableMissingError(error: any): boolean {
  if (!error) return false;
  return (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    (typeof error.message === 'string' &&
      (error.message.includes('schema cache') ||
        error.message.includes('Could not find the table') ||
        error.message.includes('relation') ||
        error.message.includes('does not exist')))
  );
}

// Registry of tables confirmed missing in Supabase
export const missingTables = new Set<string>();

export function getMissingTables(): string[] {
  return Array.from(missingTables);
}

let resolvedProductTable: string | null = null;

async function getProductTable(): Promise<string> {
  if (resolvedProductTable) return resolvedProductTable;
  if (!supabase) return 'products';

  const candidates = ['products', 'inventory', 'equipment', 'items'];
  for (const candidate of candidates) {
    try {
      const { error } = await supabase.from(candidate).select('id').limit(1);
      if (!error || !isTableMissingError(error)) {
        resolvedProductTable = candidate;
        return candidate;
      }
    } catch {
      // Continue to next candidate
    }
  }

  missingTables.add('products');
  return 'products';
}

/**
 * Normalizes a product record from Supabase, accommodating variations in column names
 * (e.g. total_warehouse_units vs total_quantity, base_price vs unit_price).
 */
export function normalizeProduct(row: any): Product {
  return {
    id: row.id,
    name: row.name || 'Untitled Equipment',
    category: row.category || 'General',
    total_quantity: Number(row.total_quantity ?? row.total_warehouse_units ?? 1),
    unit_price: Number(row.unit_price ?? row.base_price ?? 0),
    additional_hourly_rate: Number(row.additional_hourly_rate ?? row.additional_hour_charge ?? 0),
    description: row.description || '',
    dimensions: row.dimensions || '',
    power_required: row.power_required || '',
    status: row.status === 'maintenance' ? 'maintenance' : 'active',
  };
}

/**
 * Direct Supabase Inventory / Products Operations
 */
export const supabaseProducts = {
  async getAll(): Promise<Product[]> {
    if (!supabase) return [];
    try {
      const tableName = await getProductTable();
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        if (isTableMissingError(error)) {
          missingTables.add('products');
          console.warn(`Supabase table '${tableName}' not found in schema cache. Falling back to local data.`);
          return [];
        }
        console.warn('Supabase fetch products warning:', error.message);
        return [];
      }
      return (data || []).map(normalizeProduct);
    } catch (err: any) {
      console.warn('Supabase fetch products exception:', err?.message || err);
      return [];
    }
  },

  async create(product: Partial<Product>): Promise<Product> {
    if (!supabase) throw new Error('Supabase is not configured');

    const totalQty = Number(product.total_quantity ?? 1);
    const basePrice = Number(product.unit_price ?? 0);
    const extraRate = Number(product.additional_hourly_rate ?? 0);

    // Primary payload matching supabase_schema.sql
    const payload: Record<string, any> = {
      name: product.name,
      category: product.category,
      total_quantity: totalQty,
      unit_price: basePrice,
      additional_hourly_rate: extraRate,
      description: product.description || '',
      dimensions: product.dimensions || '',
      power_required: product.power_required || '',
      status: product.status || 'active',
    };

    let { data, error } = await supabase.from('products').insert(payload).select().single();

    // If there's a column mismatch (e.g. older schema with different column names),
    // safely retry with alternative column names
    if (error && error.message && error.message.includes('column')) {
      console.warn('Retrying product insert with alternative column names due to schema variance...');
      const fallbackPayload: Record<string, any> = {
        name: product.name,
        category: product.category,
        total_quantity: totalQty,
        total_warehouse_units: totalQty,
        unit_price: basePrice,
        base_price: basePrice,
        additional_hourly_rate: extraRate,
        additional_hour_charge: extraRate,
        description: product.description || '',
        dimensions: product.dimensions || '',
        power_required: product.power_required || '',
        status: product.status || 'active',
      };
      const retryResult = await supabase.from('products').insert(fallbackPayload).select().single();
      if (!retryResult.error) {
        data = retryResult.data;
        error = null;
      }
    }

    if (error) {
      if (isTableMissingError(error)) {
        missingTables.add('products');
        console.warn("Table 'products' missing in Supabase. Created product locally.");
        return {
          id: `prod_${Date.now()}`,
          name: product.name || 'Untitled Equipment',
          category: product.category || 'General',
          total_quantity: totalQty,
          unit_price: basePrice,
          additional_hourly_rate: extraRate,
          description: product.description || '',
          dimensions: product.dimensions || '',
          power_required: product.power_required || '',
          status: product.status || 'active',
        };
      }
      console.error('Supabase create product error:', error);
      throw new Error(
        `Failed to insert equipment into Supabase: ${error.message} (${error.code || 'UNKNOWN'}). Hint: Check table 'products'.`
      );
    }

    return normalizeProduct(data);
  },

  async update(id: string, updates: Partial<Product>): Promise<Product> {
    if (!supabase) throw new Error('Supabase is not configured');

    const payload: Record<string, any> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.total_quantity !== undefined) payload.total_quantity = Number(updates.total_quantity);
    if (updates.unit_price !== undefined) payload.unit_price = Number(updates.unit_price);
    if (updates.additional_hourly_rate !== undefined)
      payload.additional_hourly_rate = Number(updates.additional_hourly_rate);
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.dimensions !== undefined) payload.dimensions = updates.dimensions;
    if (updates.power_required !== undefined) payload.power_required = updates.power_required;
    if (updates.status !== undefined) payload.status = updates.status;

    try {
      const { data, error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (isTableMissingError(error)) {
          return { id, ...updates } as Product;
        }
        console.error('Supabase update product error:', error);
        throw new Error(`Failed to update equipment in Supabase: ${error.message}`);
      }

      return normalizeProduct(data);
    } catch (err: any) {
      if (isTableMissingError(err)) {
        return { id, ...updates } as Product;
      }
      throw err;
    }
  },

  async delete(id: string): Promise<void> {
    if (!supabase) throw new Error('Supabase is not configured');
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error && !isTableMissingError(error)) {
        console.error('Supabase delete product error:', error);
        throw new Error(`Failed to delete equipment from Supabase: ${error.message}`);
      }
    } catch (err: any) {
      if (!isTableMissingError(err)) throw err;
    }
  },
};

/**
 * Direct Supabase Customers Operations
 */
export const supabaseCustomers = {
  async getAll(): Promise<Customer[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        if (isTableMissingError(error)) {
          missingTables.add('customers');
          console.warn("Supabase table 'customers' not found in schema cache. Falling back to local data.");
          return [];
        }
        console.warn('Supabase fetch customers warning:', error.message);
        return [];
      }
      return (data || []).map((c) => ({
        id: c.id,
        name: c.name || '',
        phone: c.phone || '',
        whatsapp: c.whatsapp || c.phone || '',
        email: c.email || '',
        address: c.address || '',
        notes: c.notes || '',
        created_at: c.created_at || new Date().toISOString(),
      }));
    } catch (err: any) {
      console.warn('Supabase fetch customers exception:', err?.message || err);
      return [];
    }
  },

  async create(customer: Partial<Customer>): Promise<Customer> {
    if (!supabase) throw new Error('Supabase is not configured');
    const payload = {
      name: customer.name,
      phone: customer.phone,
      whatsapp: customer.whatsapp || customer.phone,
      email: customer.email || '',
      address: customer.address || '',
      notes: customer.notes || '',
    };
    try {
      const { data, error } = await supabase.from('customers').insert(payload).select().single();
      if (error) {
        if (isTableMissingError(error)) {
          missingTables.add('customers');
          return {
            id: `cust_${Date.now()}`,
            name: customer.name || '',
            phone: customer.phone || '',
            whatsapp: customer.whatsapp || customer.phone || '',
            email: customer.email || '',
            address: customer.address || '',
            notes: customer.notes || '',
            created_at: new Date().toISOString(),
          };
        }
        throw new Error(`Failed to create customer: ${error.message}`);
      }
      return data;
    } catch (err: any) {
      if (isTableMissingError(err)) {
        return {
          id: `cust_${Date.now()}`,
          name: customer.name || '',
          phone: customer.phone || '',
          whatsapp: customer.whatsapp || customer.phone || '',
          email: customer.email || '',
          address: customer.address || '',
          notes: customer.notes || '',
          created_at: new Date().toISOString(),
        };
      }
      throw err;
    }
  },

  async update(id: string, updates: Partial<Customer>): Promise<Customer> {
    if (!supabase) throw new Error('Supabase is not configured');
    try {
      const { data, error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) {
        if (isTableMissingError(error)) {
          return { id, ...updates } as Customer;
        }
        throw new Error(`Failed to update customer: ${error.message}`);
      }
      return data;
    } catch (err: any) {
      if (isTableMissingError(err)) {
        return { id, ...updates } as Customer;
      }
      throw err;
    }
  },
};

/**
 * Direct Supabase Quotations Operations
 */
export const supabaseQuotations = {
  async getAll(): Promise<Quotation[]> {
    if (!supabase) return [];
    try {
      const { data: quotes, error: qErr } = await supabase
        .from('quotations')
        .select('*, quotation_items(*)')
        .order('created_at', { ascending: false });

      if (qErr) {
        if (isTableMissingError(qErr)) {
          missingTables.add('quotations');
          console.warn("Supabase table 'quotations' not found in schema cache. Falling back to local data.");
          return [];
        }
        // If quotation_items foreign key join failed, try plain select
        const { data: fallbackQuotes, error: fErr } = await supabase
          .from('quotations')
          .select('*')
          .order('created_at', { ascending: false });

        if (fErr) {
          console.warn('Supabase fetch quotations warning:', fErr.message);
          return [];
        }

        return (fallbackQuotes || []).map((q: any) => ({
          ...q,
          items: q.items || [],
        }));
      }

      return (quotes || []).map((q: any) => ({
        id: q.id,
        quotation_number: q.quotation_number || '',
        quote_number: q.quotation_number || '',
        quote_name: q.quote_name || `${q.event_date} - ${q.customer_name}`,
        customer_id: q.customer_id,
        customer_name: q.customer_name,
        customer_phone: q.customer_phone,
        customer_whatsapp: q.customer_whatsapp || q.customer_phone,
        customer_email: q.customer_email || '',
        customer_address: q.customer_address || '',
        event_date: q.event_date,
        event_start_time: q.event_start_time,
        event_end_time: q.event_end_time,
        event_location: q.event_location,
        event_type: q.event_type || 'Birthday Party',
        number_of_guests: q.number_of_guests || 0,
        special_requirements: q.special_requirements || '',
        notes: q.notes || '',
        subtotal: Number(q.subtotal || 0),
        delivery_fee: Number(q.delivery_fee || 0),
        setup_fee: Number(q.setup_fee || 0),
        transport_fee: Number(q.transport_fee || 0),
        other_charges: Number(q.other_charges || 0),
        discount: Number(q.discount || 0),
        total_amount: Number(q.total_amount || 0),
        deposit_required: Number(q.deposit_required || 0),
        remaining_balance: Number(q.remaining_balance || 0),
        status: q.status || 'Draft',
        valid_until: q.valid_until || '',
        created_at: q.created_at || new Date().toISOString(),
        updated_at: q.updated_at || new Date().toISOString(),
        items: (q.quotation_items || []).map((it: any) => ({
          id: it.id,
          product_id: it.product_id,
          product_name_snapshot: it.product_name_snapshot,
          quantity: Number(it.quantity || 1),
          unit_price: Number(it.unit_price || 0),
          discount: Number(it.discount || 0),
          total: Number(it.total || 0),
        })),
      }));
    } catch (err: any) {
      console.warn('Supabase fetch quotations exception:', err?.message || err);
      return [];
    }
  },

  async create(data: any): Promise<Quotation> {
    if (!supabase) throw new Error('Supabase is not configured');

    const quoteNumber = data.quotation_number || `QT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const quoteName = data.quote_name || `${data.event_date} - ${data.customer_name}`;

    const quotePayload = {
      quotation_number: quoteNumber,
      quote_name: quoteName,
      customer_id: data.customer_id || null,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      customer_whatsapp: data.customer_whatsapp || data.customer_phone,
      customer_email: data.customer_email || '',
      customer_address: data.customer_address || '',
      event_date: data.event_date,
      event_start_time: data.event_start_time,
      event_end_time: data.event_end_time,
      event_location: data.event_location,
      event_type: data.event_type || 'Birthday Party',
      number_of_guests: Number(data.number_of_guests || 0),
      special_requirements: data.special_requirements || '',
      notes: data.notes || '',
      subtotal: Number(data.subtotal || 0),
      delivery_fee: Number(data.delivery_fee || 0),
      setup_fee: Number(data.setup_fee || 0),
      transport_fee: Number(data.transport_fee || 0),
      other_charges: Number(data.other_charges || 0),
      discount: Number(data.discount || 0),
      total_amount: Number(data.total_amount || 0),
      deposit_required: Number(data.deposit_required || 0),
      remaining_balance: Number(data.remaining_balance || 0),
      status: data.status || 'Draft',
      valid_until: data.valid_until || null,
    };

    try {
      const { data: quoteRecord, error: qErr } = await supabase
        .from('quotations')
        .insert(quotePayload)
        .select()
        .single();

      if (qErr) {
        if (isTableMissingError(qErr)) {
          missingTables.add('quotations');
          return {
            id: `quote_${Date.now()}`,
            ...quotePayload,
            items: data.items || [],
            quote_number: quoteNumber,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as Quotation;
        }
        console.error('Supabase quotation insert error:', qErr);
        throw new Error(`Failed to create quotation: ${qErr.message}`);
      }

      if (data.items && Array.isArray(data.items) && data.items.length > 0) {
        const itemsPayload = data.items.map((it: any) => ({
          quotation_id: quoteRecord.id,
          product_id: it.product_id || null,
          product_name_snapshot: it.product_name_snapshot || 'Equipment Item',
          quantity: Number(it.quantity || 1),
          unit_price: Number(it.unit_price || 0),
          discount: Number(it.discount || 0),
          total: Number(it.total || 0),
        }));

        try {
          const { error: itemsErr } = await supabase.from('quotation_items').insert(itemsPayload);
          if (itemsErr) {
            console.warn('Warning: Could not save quotation line items:', itemsErr.message);
          }
        } catch {
          // Non-blocking
        }
      }

      return {
        ...quoteRecord,
        items: data.items || [],
        quote_number: quoteRecord.quotation_number,
      };
    } catch (err: any) {
      if (isTableMissingError(err)) {
        return {
          id: `quote_${Date.now()}`,
          ...quotePayload,
          items: data.items || [],
          quote_number: quoteNumber,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Quotation;
      }
      throw err;
    }
  },

  async updateStatus(id: string, status: string): Promise<void> {
    if (!supabase) throw new Error('Supabase is not configured');
    try {
      const { error } = await supabase
        .from('quotations')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error && !isTableMissingError(error)) {
        throw new Error(`Failed to update quotation status: ${error.message}`);
      }
    } catch (err: any) {
      if (!isTableMissingError(err)) throw err;
    }
  },
};

/**
 * Direct Supabase Bookings Operations
 */
export const supabaseBookings = {
  async getAll(): Promise<Booking[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, booking_items(*)')
        .order('event_date', { ascending: false });

      if (error) {
        if (isTableMissingError(error)) {
          missingTables.add('bookings');
          console.warn("Supabase table 'bookings' not found in schema cache. Falling back to local data.");
          return [];
        }
        // Fallback without join
        const { data: fallbackBookings, error: fbErr } = await supabase
          .from('bookings')
          .select('*')
          .order('event_date', { ascending: false });

        if (fbErr) {
          console.warn('Supabase fetch bookings warning:', fbErr.message);
          return [];
        }

        return (fallbackBookings || []).map((b: any) => ({
          ...b,
          items: b.items || [],
        }));
      }

      return (data || []).map((b: any) => ({
        id: b.id,
        booking_number: b.booking_number,
        quotation_id: b.quotation_id,
        quotation_number: b.quotation_number || '',
        customer_id: b.customer_id,
        customer_name: b.customer_name,
        customer_phone: b.customer_phone,
        customer_whatsapp: b.customer_whatsapp || b.customer_phone,
        customer_email: b.customer_email || '',
        customer_address: b.customer_address || '',
        event_date: b.event_date,
        event_start_time: b.event_start_time,
        event_end_time: b.event_end_time,
        event_location: b.event_location,
        event_type: b.event_type || 'Birthday Party',
        number_of_guests: b.number_of_guests || 0,
        special_requirements: b.special_requirements || '',
        notes: b.notes || '',
        items: (b.booking_items || []).map((it: any) => ({
          id: it.id,
          product_id: it.product_id,
          product_name_snapshot: it.product_name_snapshot,
          quantity: Number(it.quantity || 1),
          unit_price: Number(it.unit_price || 0),
          discount: Number(it.discount || 0),
          total: Number(it.total || 0),
        })),
        subtotal: Number(b.subtotal || 0),
        delivery_fee: Number(b.delivery_fee || 0),
        setup_fee: Number(b.setup_fee || 0),
        transport_fee: Number(b.transport_fee || 0),
        other_charges: Number(b.other_charges || 0),
        discount: Number(b.discount || 0),
        total_amount: Number(b.total_amount || 0),
        deposit_required: Number(b.deposit_required || 0),
        amount_paid: Number(b.amount_paid || 0),
        balance: Number(b.balance || 0),
        status: b.status || 'Confirmed',
        payment_status: b.payment_status || 'Unpaid',
        invoice_number: b.invoice_number,
        created_at: b.created_at || new Date().toISOString(),
        updated_at: b.updated_at || new Date().toISOString(),
      }));
    } catch (err: any) {
      console.warn('Supabase fetch bookings exception:', err?.message || err);
      return [];
    }
  },
};

/**
 * Direct Supabase Invoices Operations
 */
export const supabaseInvoices = {
  async getAll(): Promise<Invoice[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (isTableMissingError(error)) {
          missingTables.add('invoices');
          console.warn("Supabase table 'invoices' not found in schema cache. Falling back to local data.");
          return [];
        }
        console.warn('Supabase fetch invoices warning:', error.message);
        return [];
      }
      return (data || []).map((inv: any) => ({
        id: inv.id,
        invoice_number: inv.invoice_number,
        booking_id: inv.booking_id,
        booking_number: inv.booking_number,
        quotation_id: inv.quotation_id,
        customer_id: inv.customer_id,
        customer_name: inv.customer_name,
        customer_phone: inv.customer_phone,
        customer_email: inv.customer_email || '',
        customer_address: inv.customer_address || '',
        event_date: inv.event_date,
        event_location: inv.event_location,
        items: typeof inv.items === 'string' ? JSON.parse(inv.items || '[]') : inv.items || [],
        subtotal: Number(inv.subtotal || 0),
        delivery_fee: Number(inv.delivery_fee || 0),
        setup_fee: Number(inv.setup_fee || 0),
        transport_fee: Number(inv.transport_fee || 0),
        other_charges: Number(inv.other_charges || 0),
        discount: Number(inv.discount || 0),
        total: Number(inv.total || 0),
        amount_paid: Number(inv.amount_paid || 0),
        balance: Number(inv.balance || 0),
        payment_method: inv.payment_method || 'Bank Transfer',
        payment_date: inv.payment_date,
        status: inv.status || 'Unpaid',
        created_at: inv.created_at || new Date().toISOString(),
      }));
    } catch (err: any) {
      console.warn('Supabase fetch invoices exception:', err?.message || err);
      return [];
    }
  },
};

/**
 * Direct Supabase Payments Operations
 */
export const supabasePayments = {
  async getAll(): Promise<Payment[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('payment_date', { ascending: false });

      if (error) {
        if (isTableMissingError(error)) {
          missingTables.add('payments');
          console.warn("Supabase table 'payments' not found in schema cache. Falling back to local data.");
          return [];
        }
        console.warn('Supabase fetch payments warning:', error.message);
        return [];
      }
      return (data || []).map((p: any) => ({
        id: p.id,
        booking_id: p.booking_id,
        booking_number: p.booking_number,
        quotation_id: p.quotation_id,
        amount: Number(p.amount || 0),
        payment_date: p.payment_date,
        payment_method: p.payment_method || 'Bank Transfer',
        transaction_reference: p.transaction_reference || '',
        payment_notes: p.payment_notes || '',
        payment_proof_url: p.payment_proof_url,
        payment_status: p.payment_status || 'Paid',
        created_at: p.created_at || new Date().toISOString(),
      }));
    } catch (err: any) {
      console.warn('Supabase fetch payments exception:', err?.message || err);
      return [];
    }
  },
};

/**
 * Direct Supabase Daily Equipment Schedule
 */
export const supabaseSchedule = {
  async getDaily(): Promise<DailyScheduleEntry[]> {
    if (!supabase) return [];
    try {
      const { data, error } = await supabase
        .from('daily_equipment_schedule')
        .select('*')
        .order('event_date', { ascending: true });

      if (error) {
        if (isTableMissingError(error)) {
          missingTables.add('daily_equipment_schedule');
          return [];
        }
        console.warn('Supabase fetch schedule warning:', error.message);
        return [];
      }
      return (data || []).map((s: any) => ({
        id: s.id,
        event_date: s.event_date,
        customer_name: s.customer_name,
        customer_phone: s.customer_phone,
        location: s.location,
        product_id: s.product_id,
        item_name: s.item_name,
        quantity: Number(s.quantity || 1),
        start_time: s.start_time,
        end_time: s.end_time,
        booking_id: s.booking_id,
        booking_number: s.booking_number,
        status: s.status || 'Confirmed',
        updated_at: s.updated_at || new Date().toISOString(),
      }));
    } catch (err: any) {
      console.warn('Supabase fetch schedule exception:', err?.message || err);
      return [];
    }
  },
};
