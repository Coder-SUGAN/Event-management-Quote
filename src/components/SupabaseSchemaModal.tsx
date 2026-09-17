import React, { useState } from 'react';
import { Database, Copy, Check, X, ExternalLink, AlertTriangle } from 'lucide-react';
import { getMissingTables } from '../lib/supabase.ts';

interface SupabaseSchemaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseSchemaModal: React.FC<SupabaseSchemaModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const missing = getMissingTables();

  if (!isOpen) return null;

  const sqlSnippet = `-- ==========================================================
-- KIDS JUMP 4 JOY - SUPABASE POSTGRESQL SCHEMA
-- Run this in your Supabase SQL Editor to create the required tables
-- ==========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PRODUCTS TABLE (Inventory Equipment)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    total_quantity INT NOT NULL DEFAULT 1 CHECK (total_quantity >= 0),
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    additional_hourly_rate NUMERIC(12, 2) DEFAULT 0.00,
    description TEXT,
    dimensions VARCHAR(100),
    power_required VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure optional columns exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS additional_hourly_rate NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE products ADD COLUMN IF NOT EXISTS dimensions VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS power_required VARCHAR(100);

-- 2. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    whatsapp VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    address TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. QUOTATIONS TABLE
CREATE TABLE IF NOT EXISTS quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_number VARCHAR(50) UNIQUE NOT NULL,
    quote_name TEXT,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    customer_whatsapp VARCHAR(50) NOT NULL,
    customer_email VARCHAR(255),
    customer_address TEXT,
    event_date DATE NOT NULL,
    event_start_time TIME NOT NULL,
    event_end_time TIME NOT NULL,
    event_location TEXT NOT NULL,
    event_type VARCHAR(100),
    number_of_guests INT DEFAULT 0,
    special_requirements TEXT,
    notes TEXT,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    delivery_fee NUMERIC(12, 2) DEFAULT 0.00,
    setup_fee NUMERIC(12, 2) DEFAULT 0.00,
    transport_fee NUMERIC(12, 2) DEFAULT 0.00,
    other_charges NUMERIC(12, 2) DEFAULT 0.00,
    discount NUMERIC(12, 2) DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    deposit_required NUMERIC(12, 2) DEFAULT 0.00,
    remaining_balance NUMERIC(12, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'Draft',
    valid_until DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. QUOTATION ITEMS
CREATE TABLE IF NOT EXISTS quotation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name_snapshot VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(12, 2) DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00
);

-- 5. BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_number VARCHAR(50) UNIQUE NOT NULL,
    quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
    quotation_number VARCHAR(50),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    customer_whatsapp VARCHAR(50) NOT NULL,
    customer_email VARCHAR(255),
    customer_address TEXT,
    event_date DATE NOT NULL,
    event_start_time TIME NOT NULL,
    event_end_time TIME NOT NULL,
    event_location TEXT NOT NULL,
    event_type VARCHAR(100),
    number_of_guests INT DEFAULT 0,
    special_requirements TEXT,
    notes TEXT,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    delivery_fee NUMERIC(12, 2) DEFAULT 0.00,
    setup_fee NUMERIC(12, 2) DEFAULT 0.00,
    transport_fee NUMERIC(12, 2) DEFAULT 0.00,
    other_charges NUMERIC(12, 2) DEFAULT 0.00,
    discount NUMERIC(12, 2) DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    deposit_required NUMERIC(12, 2) DEFAULT 0.00,
    amount_paid NUMERIC(12, 2) DEFAULT 0.00,
    balance NUMERIC(12, 2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'Confirmed',
    payment_status VARCHAR(50) DEFAULT 'Unpaid',
    invoice_number VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. BOOKING ITEMS
CREATE TABLE IF NOT EXISTS booking_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name_snapshot VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(12, 2) DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00
);

-- 7. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    booking_number VARCHAR(50) NOT NULL,
    quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'Bank Transfer',
    transaction_reference VARCHAR(100),
    payment_notes TEXT,
    payment_proof_url TEXT,
    payment_status VARCHAR(50) DEFAULT 'Paid',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. INVOICES TABLE
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    booking_number VARCHAR(50),
    quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    customer_email VARCHAR(255),
    customer_address TEXT,
    event_date DATE NOT NULL,
    event_location TEXT NOT NULL,
    items JSONB DEFAULT '[]',
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    delivery_fee NUMERIC(12, 2) DEFAULT 0.00,
    setup_fee NUMERIC(12, 2) DEFAULT 0.00,
    transport_fee NUMERIC(12, 2) DEFAULT 0.00,
    other_charges NUMERIC(12, 2) DEFAULT 0.00,
    discount NUMERIC(12, 2) DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    amount_paid NUMERIC(12, 2) DEFAULT 0.00,
    balance NUMERIC(12, 2) DEFAULT 0.00,
    payment_method VARCHAR(50) DEFAULT 'Bank Transfer',
    payment_date DATE,
    status VARCHAR(50) DEFAULT 'Unpaid',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable public read and write access for application operations
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on products" ON products FOR SELECT USING (true);
CREATE POLICY "Allow public insert on products" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on products" ON products FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on products" ON products FOR DELETE USING (true);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public all on customers" ON customers FOR ALL USING (true);

ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public all on quotations" ON quotations FOR ALL USING (true);

ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public all on quotation_items" ON quotation_items FOR ALL USING (true);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public all on bookings" ON bookings FOR ALL USING (true);

ALTER TABLE booking_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public all on booking_items" ON booking_items FOR ALL USING (true);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public all on payments" ON payments FOR ALL USING (true);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public all on invoices" ON invoices FOR ALL USING (true);
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Supabase Database Setup</h2>
              <p className="text-xs text-slate-500">
                Create missing tables in your Supabase project for live cloud sync
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-600">
          {missing.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">Tables missing in Supabase schema cache:</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {missing.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 bg-amber-200/70 text-amber-900 text-xs font-mono font-medium rounded-md"
                    >
                      public.{t}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-amber-700 mt-2">
                  The app is currently running seamlessly using high-speed local data. Run the SQL script below in your Supabase SQL Editor to enable full cloud synchronization.
                </p>
              </div>
            </div>
          )}

          <div>
            <h3 className="font-semibold text-slate-900 mb-1">Quick Instructions:</h3>
            <ol className="list-decimal list-inside space-y-1 text-xs text-slate-600 ml-1">
              <li>Open your <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="text-blue-600 underline font-medium inline-flex items-center gap-0.5">Supabase Dashboard <ExternalLink className="w-3 h-3" /></a></li>
              <li>Navigate to <strong>SQL Editor</strong> on the left sidebar</li>
              <li>Click <strong>New query</strong></li>
              <li>Paste the SQL script below and click <strong>Run</strong></li>
            </ol>
          </div>

          <div className="relative">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                SQL Schema Script
              </span>
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition-colors shadow-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied to Clipboard!' : 'Copy SQL Script'}
              </button>
            </div>
            <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-56 leading-relaxed">
              {sqlSnippet}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Local data is active and your work is safely preserved.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-300 transition-colors"
          >
            Got It / Close
          </button>
        </div>
      </div>
    </div>
  );
};
