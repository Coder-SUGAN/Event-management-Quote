-- ==========================================================
-- KIDS JUMP 4 JOY - SUPABASE POSTGRESQL SCHEMA
-- Event Management, Quotation, Booking & Inventory System
-- ==========================================================

-- Enable UUID extension if required
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE (System Admins & Staff)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'admin', -- 'admin', 'manager', 'staff'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- 3. PRODUCTS TABLE (Inventory Items)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    total_quantity INT NOT NULL DEFAULT 1 CHECK (total_quantity >= 0),
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    description TEXT,
    dimensions VARCHAR(100),
    power_required VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'maintenance'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. QUOTATIONS TABLE
CREATE TABLE IF NOT EXISTS quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. QT-2026-00001 (or quote_number)
    quote_name TEXT, -- e.g. 17-09-2026 - Suga Sugantahan (Format: DD-MM-YYYY - Customer Name)
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
    delivery_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    setup_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    transport_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    other_charges NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    deposit_required NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    remaining_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft', 
    -- 'Draft', 'Sent', 'Accepted', 'Rejected', 'Expired', 'Awaiting Payment', 'Paid', 'Converted to Booking'
    valid_until DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. QUOTATION ITEMS TABLE (Snapshot pricing rule #27)
CREATE TABLE IF NOT EXISTS quotation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name_snapshot VARCHAR(255) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL,
    discount NUMERIC(12, 2) DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. BK-2026-00001
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
    delivery_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    setup_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    transport_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    other_charges NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    deposit_required NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'Confirmed', 
    -- 'Confirmed', 'Upcoming', 'In Progress', 'Completed', 'Cancelled'
    payment_status VARCHAR(50) NOT NULL DEFAULT 'Unpaid', 
    -- 'Unpaid', 'Partially Paid', 'Paid', 'Refunded'
    invoice_number VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. BOOKING ITEMS TABLE (Reserved equipment)
CREATE TABLE IF NOT EXISTS booking_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name_snapshot VARCHAR(255) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL,
    discount NUMERIC(12, 2) DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    booking_number VARCHAR(50) NOT NULL,
    quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50) NOT NULL, -- 'Bank Transfer', 'Cash', 'Online Payment', 'Other'
    transaction_reference VARCHAR(100),
    payment_notes TEXT,
    payment_proof_url TEXT,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'Paid',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. INVOICES TABLE
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. INV-2026-00001
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    booking_number VARCHAR(50) NOT NULL,
    quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    customer_email VARCHAR(255),
    customer_address TEXT,
    event_date DATE NOT NULL,
    event_location TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal NUMERIC(12, 2) NOT NULL,
    delivery_fee NUMERIC(12, 2) DEFAULT 0.00,
    setup_fee NUMERIC(12, 2) DEFAULT 0.00,
    transport_fee NUMERIC(12, 2) DEFAULT 0.00,
    other_charges NUMERIC(12, 2) DEFAULT 0.00,
    discount NUMERIC(12, 2) DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL,
    amount_paid NUMERIC(12, 2) DEFAULT 0.00,
    balance NUMERIC(12, 2) DEFAULT 0.00,
    payment_method VARCHAR(50),
    payment_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'Unpaid',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. DAILY EQUIPMENT SCHEDULE TABLE (Requirement #17 & #28)
CREATE TABLE IF NOT EXISTS daily_equipment_schedule (
    id VARCHAR(100) PRIMARY KEY, -- Composite key: booking_id + '_' + product_id
    event_date DATE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    location TEXT NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    booking_number VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Confirmed',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(100) NOT NULL,
    reference_number VARCHAR(100),
    details TEXT,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_quotations_event_date ON quotations(event_date);
CREATE INDEX IF NOT EXISTS idx_quotations_customer_id ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_bookings_event_date ON bookings(event_date);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_daily_schedule_event_date ON daily_equipment_schedule(event_date);
CREATE INDEX IF NOT EXISTS idx_daily_schedule_product ON daily_equipment_schedule(product_id);
CREATE INDEX IF NOT EXISTS idx_invoices_booking_id ON invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
