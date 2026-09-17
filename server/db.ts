import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
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
  LineItem,
  PaymentType,
  PaymentMethod,
  PaymentStatus,
  BookingStatus,
} from '../src/types.ts';
import { calculateEventDuration, calculateItemTotal, generateQuotationName, formatToDDMMYYYY } from '../src/lib/pricing.ts';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface DatabaseSchema {
  customers: Customer[];
  products: Product[];
  quotations: Quotation[];
  bookings: Booking[];
  payments: Payment[];
  invoices: Invoice[];
  daily_schedule: DailyScheduleEntry[];
  template_settings: CompanyTemplateSettings;
  counters: {
    quotation: number;
    booking: number;
    invoice: number;
  };
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

function getInitialData(): DatabaseSchema {
  const products: Product[] = [
    {
      id: 'prod_1',
      name: 'Large Bouncy Castle',
      category: 'Bouncy Castles',
      total_quantity: 3,
      unit_price: 25000,
      additional_hourly_rate: 5000,
      description: '15ft x 15ft heavy duty castle with slide, holds up to 10 kids (ages 4-12)',
      dimensions: '15ft x 15ft x 13ft',
      power_required: '1.5HP Blower (230V)',
      status: 'active',
    },
    {
      id: 'prod_2',
      name: 'Small Bouncy Castle',
      category: 'Bouncy Castles',
      total_quantity: 5,
      unit_price: 15000,
      additional_hourly_rate: 3000,
      description: '10ft x 10ft toddler safe castle, holds up to 6 toddlers (ages 2-6)',
      dimensions: '10ft x 10ft x 9ft',
      power_required: '1.0HP Blower (230V)',
      status: 'active',
    },
    {
      id: 'prod_3',
      name: 'Water Slide Bouncy Castle',
      category: 'Bouncy Castles',
      total_quantity: 2,
      unit_price: 35000,
      additional_hourly_rate: 7000,
      description: 'Giant dual-lane water slide with splash pool, perfect for outdoor summer parties',
      dimensions: '22ft x 12ft x 15ft',
      power_required: '2.0HP Blower (230V)',
      status: 'active',
    },
    {
      id: 'prod_4',
      name: 'Generator 5KVA',
      category: 'Power & Generators',
      total_quantity: 2,
      unit_price: 8500,
      additional_hourly_rate: 1500,
      description: 'Silent diesel generator with fuel included for 6 hours, runs 2 large blowers',
      power_required: 'Self-powered (Diesel)',
      status: 'active',
    },
    {
      id: 'prod_5',
      name: 'Generator 10KVA',
      category: 'Power & Generators',
      total_quantity: 1,
      unit_price: 14000,
      additional_hourly_rate: 2500,
      description: 'Heavy duty generator for multiple inflatables and sound system',
      power_required: 'Self-powered (Diesel)',
      status: 'active',
    },
    {
      id: 'prod_6',
      name: 'Party Table',
      category: 'Tables & Chairs',
      total_quantity: 50,
      unit_price: 400,
      additional_hourly_rate: 50,
      description: 'Heavy duty 6ft folding banquet table, seats 6-8 kids or adults',
      status: 'active',
    },
    {
      id: 'prod_7',
      name: 'Plastic Chair',
      category: 'Tables & Chairs',
      total_quantity: 200,
      unit_price: 100,
      additional_hourly_rate: 20,
      description: 'Comfortable stackable resin chairs for guests and children',
      status: 'active',
    },
    {
      id: 'prod_8',
      name: 'Popcorn Machine & Operator',
      category: 'Party Machines',
      total_quantity: 3,
      unit_price: 12000,
      additional_hourly_rate: 2500,
      description: 'Commercial vintage cart popcorn machine with 100 servings + dedicated operator',
      power_required: '1200W (230V)',
      status: 'active',
    },
    {
      id: 'prod_9',
      name: 'Cotton Candy Machine & Operator',
      category: 'Party Machines',
      total_quantity: 3,
      unit_price: 12000,
      additional_hourly_rate: 2500,
      description: 'Carnival style cotton candy machine with 100 servings in assorted flavors',
      power_required: '1000W (230V)',
      status: 'active',
    },
    {
      id: 'prod_10',
      name: 'Sound System PA 1000W',
      category: 'Sound & Audio',
      total_quantity: 2,
      unit_price: 15000,
      additional_hourly_rate: 3000,
      description: '2 active speakers, mixer, 2 wireless mics, Bluetooth and aux inputs',
      power_required: '500W (230V)',
      status: 'active',
    },
  ];

  const customers: Customer[] = [
    {
      id: 'cust_1',
      name: 'John Perera',
      phone: '+94 77 234 5678',
      whatsapp: '+94 77 234 5678',
      email: 'john.perera@gmail.com',
      address: '12 Temple Road, Kurunegala',
      created_at: new Date().toISOString(),
    },
    {
      id: 'cust_2',
      name: 'Nimal Fernando',
      phone: '+94 71 876 5432',
      whatsapp: '+94 71 876 5432',
      email: 'nimal.fdo@yahoo.com',
      address: '84 Beach Road, Kuliyapitiya',
      created_at: new Date().toISOString(),
    },
    {
      id: 'cust_3',
      name: 'Anoma Jayasinghe',
      phone: '+94 76 555 1234',
      whatsapp: '+94 76 555 1234',
      email: 'anoma.j@outlook.com',
      address: '35 Lake View Gardens, Negombo',
      created_at: new Date().toISOString(),
    },
  ];

  // Seed sample confirmed bookings for 15 September 2026 to match prompt requirements:
  // John Perera: Large Bouncy Castle x 1, Generator 5KVA x 1, Party Tables x 5
  // Nimal: Large Bouncy Castle x 1, Generator 5KVA x 1, Plastic Chairs x 30
  // Result for 15 September: Large Bouncy Castle (3 total, 2 booked, 1 available); Generator 5KVA (2 total, 2 booked, 0 available - fully booked)
  const sampleDate = '2026-09-15';

  const booking1Items: LineItem[] = [
    {
      id: 'item_1_1',
      product_id: 'prod_1',
      product_name_snapshot: 'Large Bouncy Castle',
      quantity: 1,
      unit_price: 25000,
      discount: 0,
      total: 25000,
      category: 'Bouncy Castles',
    },
    {
      id: 'item_1_2',
      product_id: 'prod_4',
      product_name_snapshot: 'Generator 5KVA',
      quantity: 1,
      unit_price: 8500,
      discount: 0,
      total: 8500,
      category: 'Power & Generators',
    },
    {
      id: 'item_1_3',
      product_id: 'prod_6',
      product_name_snapshot: 'Party Table',
      quantity: 5,
      unit_price: 400,
      discount: 0,
      total: 2000,
      category: 'Tables & Chairs',
    },
  ];

  const booking2Items: LineItem[] = [
    {
      id: 'item_2_1',
      product_id: 'prod_1',
      product_name_snapshot: 'Large Bouncy Castle',
      quantity: 1,
      unit_price: 25000,
      discount: 0,
      total: 25000,
      category: 'Bouncy Castles',
    },
    {
      id: 'item_2_2',
      product_id: 'prod_4',
      product_name_snapshot: 'Generator 5KVA',
      quantity: 1,
      unit_price: 8500,
      discount: 0,
      total: 8500,
      category: 'Power & Generators',
    },
    {
      id: 'item_2_3',
      product_id: 'prod_7',
      product_name_snapshot: 'Plastic Chair',
      quantity: 30,
      unit_price: 100,
      discount: 0,
      total: 3000,
      category: 'Tables & Chairs',
    },
  ];

  const bookings: Booking[] = [
    {
      id: 'bk_1',
      booking_number: 'BK-2026-00001',
      quotation_id: 'qt_1',
      quotation_number: 'QT-2026-00001',
      customer_id: 'cust_1',
      customer_name: 'John Perera',
      customer_phone: '+94 77 234 5678',
      customer_whatsapp: '+94 77 234 5678',
      customer_email: 'john.perera@gmail.com',
      customer_address: '12 Temple Road, Kurunegala',
      event_date: sampleDate,
      event_start_time: '10:00',
      event_end_time: '18:00',
      event_location: 'Kurunegala Town Hall Grounds',
      event_type: "Child's 7th Birthday Party",
      number_of_guests: 60,
      special_requirements: 'Setup required by 9:30 AM before guests arrive',
      notes: 'Customer paid 50% deposit via Commercial Bank transfer.',
      items: booking1Items,
      subtotal: 35500,
      delivery_fee: 2500,
      setup_fee: 1500,
      transport_fee: 0,
      other_charges: 0,
      discount: 1000,
      total_amount: 38500,
      deposit_required: 19250,
      amount_paid: 19250,
      balance: 19250,
      status: 'Confirmed',
      payment_status: 'Partially Paid',
      invoice_number: 'INV-2026-00001',
      created_at: new Date('2026-09-01T09:00:00Z').toISOString(),
      updated_at: new Date('2026-09-01T10:30:00Z').toISOString(),
    },
    {
      id: 'bk_2',
      booking_number: 'BK-2026-00002',
      quotation_id: 'qt_2',
      quotation_number: 'QT-2026-00002',
      customer_id: 'cust_2',
      customer_name: 'Nimal Fernando',
      customer_phone: '+94 71 876 5432',
      customer_whatsapp: '+94 71 876 5432',
      customer_email: 'nimal.fdo@yahoo.com',
      customer_address: '84 Beach Road, Kuliyapitiya',
      event_date: sampleDate,
      event_start_time: '14:00',
      event_end_time: '20:00',
      event_location: 'Kuliyapitiya Private Garden',
      event_type: 'Family Carnival',
      number_of_guests: 80,
      special_requirements: 'Needs silent generator near lawn area',
      notes: 'Full payment completed upon confirmation.',
      items: booking2Items,
      subtotal: 36500,
      delivery_fee: 3000,
      setup_fee: 1500,
      transport_fee: 0,
      other_charges: 0,
      discount: 1000,
      total_amount: 40000,
      deposit_required: 20000,
      amount_paid: 40000,
      balance: 0,
      status: 'Confirmed',
      payment_status: 'Paid',
      invoice_number: 'INV-2026-00002',
      created_at: new Date('2026-09-02T11:00:00Z').toISOString(),
      updated_at: new Date('2026-09-02T12:15:00Z').toISOString(),
    },
  ];

  const quotations: Quotation[] = [
    {
      id: 'qt_1',
      quotation_number: 'QT-2026-00001',
      quote_number: 'QT-2026-00001',
      quote_name: generateQuotationName(sampleDate, 'John Perera'),
      customer_id: 'cust_1',
      customer_name: 'John Perera',
      customer_phone: '+94 77 234 5678',
      customer_whatsapp: '+94 77 234 5678',
      customer_email: 'john.perera@gmail.com',
      customer_address: '12 Temple Road, Kurunegala',
      event_date: sampleDate,
      event_start_time: '10:00',
      event_end_time: '18:00',
      event_location: 'Kurunegala Town Hall Grounds',
      event_type: "Child's 7th Birthday Party",
      number_of_guests: 60,
      special_requirements: 'Setup required by 9:30 AM before guests arrive',
      notes: 'Converted to confirmed booking BK-2026-00001.',
      items: booking1Items,
      subtotal: 35500,
      delivery_fee: 2500,
      setup_fee: 1500,
      transport_fee: 0,
      other_charges: 0,
      discount: 1000,
      total_amount: 38500,
      deposit_required: 19250,
      remaining_balance: 19250,
      status: 'Converted to Booking',
      valid_until: '2026-09-14',
      created_at: new Date('2026-09-01T08:30:00Z').toISOString(),
      updated_at: new Date('2026-09-01T10:30:00Z').toISOString(),
    },
    {
      id: 'qt_2',
      quotation_number: 'QT-2026-00002',
      quote_number: 'QT-2026-00002',
      quote_name: generateQuotationName(sampleDate, 'Nimal Fernando'),
      customer_id: 'cust_2',
      customer_name: 'Nimal Fernando',
      customer_phone: '+94 71 876 5432',
      customer_whatsapp: '+94 71 876 5432',
      customer_email: 'nimal.fdo@yahoo.com',
      customer_address: '84 Beach Road, Kuliyapitiya',
      event_date: sampleDate,
      event_start_time: '14:00',
      event_end_time: '20:00',
      event_location: 'Kuliyapitiya Private Garden',
      event_type: 'Family Carnival',
      number_of_guests: 80,
      special_requirements: 'Needs silent generator near lawn area',
      notes: 'Converted to confirmed booking BK-2026-00002.',
      items: booking2Items,
      subtotal: 36500,
      delivery_fee: 3000,
      setup_fee: 1500,
      transport_fee: 0,
      other_charges: 0,
      discount: 1000,
      total_amount: 40000,
      deposit_required: 20000,
      remaining_balance: 0,
      status: 'Converted to Booking',
      valid_until: '2026-09-14',
      created_at: new Date('2026-09-02T10:00:00Z').toISOString(),
      updated_at: new Date('2026-09-02T12:15:00Z').toISOString(),
    },
    {
      id: 'qt_3',
      quotation_number: 'QT-2026-00003',
      quote_number: 'QT-2026-00003',
      quote_name: generateQuotationName('2026-09-20', 'Anoma Jayasinghe'),
      customer_id: 'cust_3',
      customer_name: 'Anoma Jayasinghe',
      customer_phone: '+94 76 555 1234',
      customer_whatsapp: '+94 76 555 1234',
      customer_email: 'anoma.j@outlook.com',
      customer_address: '35 Lake View Gardens, Negombo',
      event_date: '2026-09-20',
      event_start_time: '11:00',
      event_end_time: '17:00',
      event_location: 'Negombo Villa',
      event_type: 'School Vacation Party',
      number_of_guests: 40,
      special_requirements: 'Water connection needed for water slide',
      notes: 'Quotation sent via WhatsApp, awaiting customer payment response.',
      items: [
        {
          id: 'item_3_1',
          product_id: 'prod_3',
          product_name_snapshot: 'Water Slide Bouncy Castle',
          quantity: 1,
          unit_price: 35000,
          discount: 0,
          total: 35000,
          category: 'Bouncy Castles',
        },
        {
          id: 'item_3_2',
          product_id: 'prod_8',
          product_name_snapshot: 'Popcorn Machine & Operator',
          quantity: 1,
          unit_price: 12000,
          discount: 1000,
          total: 11000,
          category: 'Party Machines',
        },
      ],
      subtotal: 46000,
      delivery_fee: 3500,
      setup_fee: 2000,
      transport_fee: 0,
      other_charges: 0,
      discount: 1500,
      total_amount: 50000,
      deposit_required: 25000,
      remaining_balance: 25000,
      status: 'Awaiting Payment',
      valid_until: '2026-09-18',
      created_at: new Date('2026-09-03T08:00:00Z').toISOString(),
      updated_at: new Date('2026-09-03T08:00:00Z').toISOString(),
    },
  ];

  const payments: Payment[] = [
    {
      id: 'pay_1',
      booking_id: 'bk_1',
      booking_number: 'BK-2026-00001',
      quotation_id: 'qt_1',
      amount: 19250,
      payment_date: '2026-09-01',
      payment_method: 'Bank Transfer',
      transaction_reference: 'COMB-TX-99882231',
      payment_notes: 'Advance deposit of 50% received into Commercial Bank account.',
      payment_proof_name: 'deposit_slip_perera.jpg',
      payment_status: 'Paid',
      created_at: new Date('2026-09-01T10:25:00Z').toISOString(),
    },
    {
      id: 'pay_2',
      booking_id: 'bk_2',
      booking_number: 'BK-2026-00002',
      quotation_id: 'qt_2',
      amount: 40000,
      payment_date: '2026-09-02',
      payment_method: 'Online Payment',
      transaction_reference: 'IPG-PAY-441198',
      payment_notes: 'Full payment settled via online bank transfer.',
      payment_proof_name: 'receipt_441198.pdf',
      payment_status: 'Paid',
      created_at: new Date('2026-09-02T12:10:00Z').toISOString(),
    },
  ];

  const invoices: Invoice[] = [
    {
      id: 'inv_1',
      invoice_number: 'INV-2026-00001',
      booking_id: 'bk_1',
      booking_number: 'BK-2026-00001',
      quotation_id: 'qt_1',
      customer_id: 'cust_1',
      customer_name: 'John Perera',
      customer_phone: '+94 77 234 5678',
      customer_email: 'john.perera@gmail.com',
      customer_address: '12 Temple Road, Kurunegala',
      event_date: sampleDate,
      event_location: 'Kurunegala Town Hall Grounds',
      items: booking1Items,
      subtotal: 35500,
      delivery_fee: 2500,
      setup_fee: 1500,
      transport_fee: 0,
      other_charges: 0,
      discount: 1000,
      total: 38500,
      amount_paid: 19250,
      balance: 19250,
      payment_method: 'Bank Transfer',
      payment_date: '2026-09-01',
      status: 'Partially Paid',
      created_at: new Date('2026-09-01T10:30:00Z').toISOString(),
    },
    {
      id: 'inv_2',
      invoice_number: 'INV-2026-00002',
      booking_id: 'bk_2',
      booking_number: 'BK-2026-00002',
      quotation_id: 'qt_2',
      customer_id: 'cust_2',
      customer_name: 'Nimal Fernando',
      customer_phone: '+94 71 876 5432',
      customer_email: 'nimal.fdo@yahoo.com',
      customer_address: '84 Beach Road, Kuliyapitiya',
      event_date: sampleDate,
      event_location: 'Kuliyapitiya Private Garden',
      items: booking2Items,
      subtotal: 36500,
      delivery_fee: 3000,
      setup_fee: 1500,
      transport_fee: 0,
      other_charges: 0,
      discount: 1000,
      total: 40000,
      amount_paid: 40000,
      balance: 0,
      payment_method: 'Online Payment',
      payment_date: '2026-09-02',
      status: 'Paid',
      created_at: new Date('2026-09-02T12:15:00Z').toISOString(),
    },
  ];

  // Daily Schedule items generated from confirmed bookings
  const daily_schedule: DailyScheduleEntry[] = [
    {
      id: 'bk_1_prod_1',
      event_date: sampleDate,
      customer_name: 'John Perera',
      customer_phone: '+94 77 234 5678',
      location: 'Kurunegala',
      product_id: 'prod_1',
      item_name: 'Large Bouncy Castle',
      quantity: 1,
      start_time: '10:00',
      end_time: '18:00',
      booking_id: 'bk_1',
      booking_number: 'BK-2026-00001',
      status: 'Confirmed',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'bk_1_prod_4',
      event_date: sampleDate,
      customer_name: 'John Perera',
      customer_phone: '+94 77 234 5678',
      location: 'Kurunegala',
      product_id: 'prod_4',
      item_name: 'Generator 5KVA',
      quantity: 1,
      start_time: '10:00',
      end_time: '18:00',
      booking_id: 'bk_1',
      booking_number: 'BK-2026-00001',
      status: 'Confirmed',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'bk_1_prod_6',
      event_date: sampleDate,
      customer_name: 'John Perera',
      customer_phone: '+94 77 234 5678',
      location: 'Kurunegala',
      product_id: 'prod_6',
      item_name: 'Party Table',
      quantity: 5,
      start_time: '10:00',
      end_time: '18:00',
      booking_id: 'bk_1',
      booking_number: 'BK-2026-00001',
      status: 'Confirmed',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'bk_2_prod_1',
      event_date: sampleDate,
      customer_name: 'Nimal Fernando',
      customer_phone: '+94 71 876 5432',
      location: 'Kuliyapitiya',
      product_id: 'prod_1',
      item_name: 'Large Bouncy Castle',
      quantity: 1,
      start_time: '14:00',
      end_time: '20:00',
      booking_id: 'bk_2',
      booking_number: 'BK-2026-00002',
      status: 'Confirmed',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'bk_2_prod_4',
      event_date: sampleDate,
      customer_name: 'Nimal Fernando',
      customer_phone: '+94 71 876 5432',
      location: 'Kuliyapitiya',
      product_id: 'prod_4',
      item_name: 'Generator 5KVA',
      quantity: 1,
      start_time: '14:00',
      end_time: '20:00',
      booking_id: 'bk_2',
      booking_number: 'BK-2026-00002',
      status: 'Confirmed',
      updated_at: new Date().toISOString(),
    },
    {
      id: 'bk_2_prod_7',
      event_date: sampleDate,
      customer_name: 'Nimal Fernando',
      customer_phone: '+94 71 876 5432',
      location: 'Kuliyapitiya',
      product_id: 'prod_7',
      item_name: 'Plastic Chair',
      quantity: 30,
      start_time: '14:00',
      end_time: '20:00',
      booking_id: 'bk_2',
      booking_number: 'BK-2026-00002',
      status: 'Confirmed',
      updated_at: new Date().toISOString(),
    },
  ];

  return {
    customers,
    products,
    quotations,
    bookings,
    payments,
    invoices,
    daily_schedule,
    template_settings: DEFAULT_TEMPLATES,
    counters: {
      quotation: 3,
      booking: 2,
      invoice: 2,
    },
  };
}

class DatabaseStore {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Ensure template_settings and counters exist
        if (!parsed.template_settings) parsed.template_settings = DEFAULT_TEMPLATES;
        if (!parsed.counters) parsed.counters = { quotation: 3, booking: 2, invoice: 2 };
        // Ensure all products have additional_hourly_rate
        if (Array.isArray(parsed.products)) {
          const defaultRates: Record<string, number> = {
            prod_1: 5000,
            prod_2: 3000,
            prod_3: 7000,
            prod_4: 1500,
            prod_5: 2500,
            prod_6: 50,
            prod_7: 20,
            prod_8: 2500,
            prod_9: 2500,
            prod_10: 3000,
          };
          parsed.products.forEach((p: any) => {
            if (p.additional_hourly_rate === undefined || p.additional_hourly_rate === null || isNaN(p.additional_hourly_rate)) {
              p.additional_hourly_rate = defaultRates[p.id] ?? Math.round((Number(p.unit_price) || 0) * 0.2);
            }
          });
        }
        // Ensure all quotations have version, version_history, quote_number, and quote_name
        if (Array.isArray(parsed.quotations)) {
          parsed.quotations.forEach((q: any) => {
            if (!q.version) q.version = 1;
            if (!q.version_history) q.version_history = [];
            if (!q.quote_number) q.quote_number = q.quotation_number;
            if (!q.quote_name) {
              q.quote_name = generateQuotationName(q.event_date, q.customer_name);
            }
          });
        }
        return parsed;
      }
    } catch (err) {
      console.warn('Could not read persistent DB file, seeding fresh data:', err);
    }
    const initial = getInitialData();
    this.save(initial);
    return initial;
  }

  private save(dataToSave?: DatabaseSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(dataToSave || this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving db.json:', err);
    }
  }

  public getRawData(): DatabaseSchema {
    return this.data;
  }

  // --- Customers ---
  public getCustomers(): Customer[] {
    return this.data.customers;
  }

  public getCustomer(id: string): Customer | undefined {
    return this.data.customers.find((c) => c.id === id);
  }

  public createCustomer(customer: Omit<Customer, 'id' | 'created_at'>): Customer {
    const newCust: Customer = {
      id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ...customer,
      created_at: new Date().toISOString(),
    };
    this.data.customers.unshift(newCust);
    this.save();
    return newCust;
  }

  public updateCustomer(id: string, updates: Partial<Customer>): Customer {
    const idx = this.data.customers.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Customer not found');
    const oldName = this.data.customers[idx].name;
    this.data.customers[idx] = { ...this.data.customers[idx], ...updates };

    // If customer name is changed, update quotation name for quotations that are not finalized
    if (updates.name && updates.name.trim() !== oldName.trim()) {
      const cleanNewName = updates.name.trim().replace(/\s+/g, ' ');
      this.data.quotations.forEach((q) => {
        if (q.customer_id === id && q.status !== 'Converted to Booking') {
          q.customer_name = cleanNewName;
          q.quote_name = generateQuotationName(q.event_date, cleanNewName);
          q.quote_number = q.quotation_number;
          q.updated_at = new Date().toISOString();
        }
      });
    }

    this.save();
    return this.data.customers[idx];
  }

  // --- Products ---
  public getProducts(): Product[] {
    return this.data.products;
  }

  public getProduct(id: string): Product | undefined {
    return this.data.products.find((p) => p.id === id);
  }

  public createProduct(product: Omit<Product, 'id'>): Product {
    const newProd: Product = {
      id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ...product,
    };
    this.data.products.push(newProd);
    this.save();
    return newProd;
  }

  public updateProduct(id: string, updates: Partial<Product>): Product {
    const idx = this.data.products.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error('Product not found');
    this.data.products[idx] = { ...this.data.products[idx], ...updates };
    this.save();
    return this.data.products[idx];
  }

  public deleteProduct(id: string): boolean {
    const idx = this.data.products.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    this.data.products.splice(idx, 1);
    this.save();
    return true;
  }

  // --- Date-Based Inventory Availability ---
  // Calculates: Total Inventory - Confirmed Bookings for Date = Available Inventory
  public getAvailabilityForDate(date: string): ItemAvailability[] {
    if (!date) return [];

    // Active bookings on that date (Confirmed, Upcoming, In Progress - NOT Cancelled!)
    const activeBookings = this.data.bookings.filter(
      (b) => b.event_date === date && b.status !== 'Cancelled'
    );

    // Aggregate booked quantities per product
    const bookedMap = new Map<string, number>();
    for (const booking of activeBookings) {
      for (const item of booking.items) {
        const current = bookedMap.get(item.product_id) || 0;
        bookedMap.set(item.product_id, current + item.quantity);
      }
    }

    return this.data.products.map((prod) => {
      const booked = bookedMap.get(prod.id) || 0;
      const available = Math.max(0, prod.total_quantity - booked);
      let status: 'available' | 'limited' | 'not_available' = 'available';

      if (available === 0) {
        status = 'not_available';
      } else if (available === 1 || available <= Math.ceil(prod.total_quantity * 0.3)) {
        status = 'limited';
      }

      return {
        product: prod,
        total_quantity: prod.total_quantity,
        booked_quantity: booked,
        available_quantity: available,
        status,
      };
    });
  }

  // --- Quotations ---
  public getQuotations(): Quotation[] {
    return this.data.quotations;
  }

  public getQuotation(id: string): Quotation | undefined {
    return this.data.quotations.find((q) => q.id === id || q.quotation_number === id);
  }

  public createQuotation(input: {
    customer: { id?: string; name: string; phone: string; whatsapp: string; email: string; address: string };
    event: {
      date: string;
      start_time: string;
      end_time: string;
      location: string;
      type: string;
      number_of_guests: number;
      special_requirements: string;
      notes: string;
    };
    items: Array<{
      product_id: string;
      quantity: number;
      unit_price: number;
      additional_hourly_rate?: number;
      discount: number;
      category?: string;
    }>;
    charges: {
      delivery_fee: number;
      setup_fee: number;
      transport_fee: number;
      other_charges: number;
      discount: number;
      deposit_required: number;
    };
  }): Quotation {
    // 1. Verify or create customer
    let custId = input.customer.id;
    if (!custId) {
      const created = this.createCustomer({
        name: input.customer.name,
        phone: input.customer.phone,
        whatsapp: input.customer.whatsapp || input.customer.phone,
        email: input.customer.email,
        address: input.customer.address,
      });
      custId = created.id;
    }

    // 2. Validate availability for each requested item on event date
    const availability = this.getAvailabilityForDate(input.event.date);
    const availMap = new Map<string, number>();
    availability.forEach((a) => availMap.set(a.product.id, a.available_quantity));

    for (const item of input.items) {
      const avail = availMap.get(item.product_id) ?? 0;
      const prod = this.getProduct(item.product_id);
      const name = prod?.name || 'Item';
      if (item.quantity > avail) {
        throw new Error(
          `Cannot add ${item.quantity} units of "${name}". Only ${avail} available on ${input.event.date}.`
        );
      }
    }

    // 3. Build line items with snapshot details and duration-based pricing
    const durationInfo = calculateEventDuration(input.event.start_time, input.event.end_time);
    if (!durationInfo.isValid) {
      throw new Error(durationInfo.error || 'End time must be later than start time.');
    }

    const lineItems: LineItem[] = input.items.map((it, idx) => {
      const prod = this.getProduct(it.product_id);
      const unit_price = Number(it.unit_price ?? prod?.unit_price ?? 0);
      const additional_hourly_rate = Number(
        it.additional_hourly_rate ?? prod?.additional_hourly_rate ?? 0
      );
      const qty = Math.max(1, Number(it.quantity || 1));
      const discount = Number(it.discount ?? 0);

      const pricing = calculateItemTotal(
        unit_price,
        additional_hourly_rate,
        qty,
        durationInfo.additionalHours,
        discount
      );

      return {
        id: `qitem_${Date.now()}_${idx}`,
        product_id: it.product_id,
        product_name_snapshot: prod?.name || 'Custom Product',
        quantity: qty,
        unit_price,
        base_price: unit_price,
        additional_hourly_rate,
        additional_hours: durationInfo.additionalHours,
        base_total: pricing.baseTotal,
        additional_total: pricing.additionalTotal,
        discount,
        total: pricing.total,
        category: prod?.category || 'General',
      };
    });

    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
    const delivery_fee = Number(input.charges.delivery_fee || 0);
    const setup_fee = Number(input.charges.setup_fee || 0);
    const transport_fee = Number(input.charges.transport_fee || 0);
    const other_charges = Number(input.charges.other_charges || 0);
    const quote_discount = Number(input.charges.discount || 0);
    const total_amount = Math.max(0, subtotal + delivery_fee + setup_fee + transport_fee + other_charges - quote_discount);

    const deposit_required =
      input.charges.deposit_required !== undefined && input.charges.deposit_required !== null
        ? Number(input.charges.deposit_required)
        : Math.round(total_amount * 0.5);
    const remaining_balance = Math.max(0, total_amount - deposit_required);

    // 4. Generate unique sequential Quotation Number: QT-2026-00001
    this.data.counters.quotation += 1;
    const year = new Date().getFullYear();
    const seq = String(this.data.counters.quotation).padStart(5, '0');
    const quotation_number = `QT-${year}-${seq}`;

    // Clean customer name: trim unnecessary spaces
    const cleanCustomerName = (input.customer.name || '').trim().replace(/\s+/g, ' ');
    // Automatically generate human-readable quotation name: DD-MM-YYYY - Customer Name
    const quote_name = generateQuotationName(input.event.date, cleanCustomerName);

    // Valid for 7 days
    const validUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const quotation: Quotation = {
      id: `qt_${Date.now()}`,
      quotation_number,
      quote_number: quotation_number,
      quote_name,
      version: 1,
      version_history: [],
      customer_id: custId,
      customer_name: cleanCustomerName,
      customer_phone: input.customer.phone,
      customer_whatsapp: input.customer.whatsapp || input.customer.phone,
      customer_email: input.customer.email,
      customer_address: input.customer.address,
      event_date: input.event.date,
      event_start_time: input.event.start_time,
      event_end_time: input.event.end_time,
      event_duration_minutes: durationInfo.totalMinutes,
      event_duration_formatted: durationInfo.formattedDuration,
      included_hours: 3,
      additional_hours: durationInfo.additionalHours,
      event_location: input.event.location,
      event_type: input.event.type,
      number_of_guests: Number(input.event.number_of_guests || 0),
      special_requirements: input.event.special_requirements || '',
      notes: input.event.notes || '',
      items: lineItems,
      subtotal,
      delivery_fee,
      setup_fee,
      transport_fee,
      other_charges,
      discount: quote_discount,
      total_amount,
      deposit_required,
      remaining_balance,
      status: 'Sent',
      valid_until: validUntil,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.data.quotations.unshift(quotation);
    this.save();
    return quotation;
  }

  public editQuotation(
    id: string,
    input: {
      customer?: { name?: string; phone?: string; whatsapp?: string; email?: string; address?: string };
      event?: {
        date?: string;
        start_time?: string;
        end_time?: string;
        location?: string;
        type?: string;
        number_of_guests?: number;
        special_requirements?: string;
        notes?: string;
      };
      items?: Array<{
        product_id: string;
        quantity: number;
        unit_price: number;
        additional_hourly_rate?: number;
        discount?: number;
        category?: string;
      }>;
      charges?: {
        delivery_fee?: number;
        setup_fee?: number;
        transport_fee?: number;
        other_charges?: number;
        discount?: number;
        deposit_required?: number;
      };
      notes?: string;
      terms_and_conditions?: string;
      status?: Quotation['status'];
      change_summary?: string;
      changed_by?: string;
    }
  ): Quotation {
    const quote = this.data.quotations.find((q) => q.id === id || q.quotation_number === id);
    if (!quote) throw new Error('Quotation not found');

    // Archive current version into version_history
    const currentVersionNum = quote.version || 1;
    const historyEntry = {
      version: currentVersionNum,
      created_at: quote.updated_at || quote.created_at,
      created_by: input.changed_by || 'Admin',
      change_summary:
        input.change_summary ||
        (currentVersionNum === 1 ? 'Original quotation' : `Revision for Version ${currentVersionNum}`),
      items: JSON.parse(JSON.stringify(quote.items)),
      subtotal: quote.subtotal,
      delivery_fee: quote.delivery_fee,
      setup_fee: quote.setup_fee,
      transport_fee: quote.transport_fee,
      other_charges: quote.other_charges,
      discount: quote.discount,
      total_amount: quote.total_amount,
      deposit_required: quote.deposit_required,
      remaining_balance: quote.remaining_balance,
      event_date: quote.event_date,
      event_start_time: quote.event_start_time,
      event_end_time: quote.event_end_time,
      event_duration_minutes: quote.event_duration_minutes,
      event_duration_formatted: quote.event_duration_formatted,
      included_hours: quote.included_hours,
      additional_hours: quote.additional_hours,
      event_location: quote.event_location,
      event_type: quote.event_type,
      number_of_guests: quote.number_of_guests,
      special_requirements: quote.special_requirements,
      notes: quote.notes,
      terms_and_conditions: quote.terms_and_conditions,
      status: quote.status,
      quote_number: quote.quote_number || quote.quotation_number,
      quote_name: quote.quote_name || generateQuotationName(quote.event_date, quote.customer_name),
    };

    quote.version_history = quote.version_history || [];
    quote.version_history.unshift(historyEntry);
    quote.version = currentVersionNum + 1;

    // Apply customer changes
    if (input.customer) {
      if (input.customer.name) quote.customer_name = input.customer.name.trim().replace(/\s+/g, ' ');
      if (input.customer.phone) quote.customer_phone = input.customer.phone;
      if (input.customer.whatsapp) quote.customer_whatsapp = input.customer.whatsapp;
      if (input.customer.email !== undefined) quote.customer_email = input.customer.email;
      if (input.customer.address !== undefined) quote.customer_address = input.customer.address;
    }

    // Apply event changes
    if (input.event) {
      if (input.event.date) quote.event_date = input.event.date;
      if (input.event.start_time) quote.event_start_time = input.event.start_time;
      if (input.event.end_time) quote.event_end_time = input.event.end_time;
      if (input.event.location) quote.event_location = input.event.location;
      if (input.event.type) quote.event_type = input.event.type;
      if (input.event.number_of_guests !== undefined) quote.number_of_guests = input.event.number_of_guests;
      if (input.event.special_requirements !== undefined)
        quote.special_requirements = input.event.special_requirements;
      if (input.event.notes !== undefined) quote.notes = input.event.notes;
    }

    // Recalculate event duration
    const durationInfo = calculateEventDuration(quote.event_start_time, quote.event_end_time);
    quote.event_duration_minutes = durationInfo.totalMinutes;
    quote.event_duration_formatted = durationInfo.formattedDuration;
    quote.included_hours = 3;
    quote.additional_hours = durationInfo.additionalHours;

    // Rebuild line items if updated items are provided
    if (input.items && Array.isArray(input.items)) {
      quote.items = input.items.map((it, idx) => {
        const prod = this.getProduct(it.product_id);
        const unit_price = Number(it.unit_price ?? prod?.unit_price ?? 0);
        const additional_hourly_rate = Number(
          it.additional_hourly_rate ?? prod?.additional_hourly_rate ?? 0
        );
        const qty = Math.max(1, Number(it.quantity || 1));
        const discount = Number(it.discount ?? 0);
        const pricing = calculateItemTotal(
          unit_price,
          additional_hourly_rate,
          qty,
          durationInfo.additionalHours,
          discount
        );

        return {
          id: (it as any).id || `qitem_${Date.now()}_${idx}`,
          product_id: it.product_id,
          product_name_snapshot: prod?.name || (it as any).product_name_snapshot || 'Rental Equipment',
          quantity: qty,
          unit_price,
          base_price: unit_price,
          additional_hourly_rate,
          additional_hours: durationInfo.additionalHours,
          base_total: pricing.baseTotal,
          additional_total: pricing.additionalTotal,
          discount,
          total: pricing.total,
          category: prod?.category || (it as any).category || 'General',
        };
      });
    }

    // Recalculate financial totals
    const subtotal = quote.items.reduce((sum, item) => sum + item.total, 0);
    const delivery_fee =
      input.charges?.delivery_fee !== undefined ? Number(input.charges.delivery_fee) : quote.delivery_fee;
    const setup_fee =
      input.charges?.setup_fee !== undefined ? Number(input.charges.setup_fee) : quote.setup_fee;
    const transport_fee =
      input.charges?.transport_fee !== undefined ? Number(input.charges.transport_fee) : quote.transport_fee;
    const other_charges =
      input.charges?.other_charges !== undefined ? Number(input.charges.other_charges) : quote.other_charges;
    const discount =
      input.charges?.discount !== undefined ? Number(input.charges.discount) : quote.discount;
    const total_amount = Math.max(0, subtotal + delivery_fee + setup_fee + transport_fee + other_charges - discount);
    const deposit_required =
      input.charges?.deposit_required !== undefined
        ? Number(input.charges.deposit_required)
        : Math.round(total_amount * 0.5);
    const remaining_balance = Math.max(0, total_amount - deposit_required);

    quote.subtotal = subtotal;
    quote.delivery_fee = delivery_fee;
    quote.setup_fee = setup_fee;
    quote.transport_fee = transport_fee;
    quote.other_charges = other_charges;
    quote.discount = discount;
    quote.total_amount = total_amount;
    quote.deposit_required = deposit_required;
    quote.remaining_balance = remaining_balance;

    if (input.notes !== undefined) quote.notes = input.notes;
    if (input.terms_and_conditions !== undefined) quote.terms_and_conditions = input.terms_and_conditions;

    // Automatically recalculate quotation name: DD-MM-YYYY - Customer Name
    quote.quote_number = quote.quotation_number;
    quote.quote_name = generateQuotationName(quote.event_date, quote.customer_name);

    // Status: default to Revised or the explicitly provided status
    quote.status = input.status || 'Revised';
    quote.updated_at = new Date().toISOString();

    this.save();
    return quote;
  }

  public duplicateQuotation(id: string): Quotation {
    const orig = this.getQuotation(id);
    if (!orig) throw new Error('Quotation not found');

    this.data.counters.quotation += 1;
    const year = new Date().getFullYear();
    const seq = String(this.data.counters.quotation).padStart(5, '0');
    const quotation_number = `QT-${year}-${seq}`;

    const newQuote: Quotation = {
      ...JSON.parse(JSON.stringify(orig)),
      id: `qt_${Date.now()}`,
      quotation_number,
      quote_number: quotation_number,
      quote_name: generateQuotationName(orig.event_date, orig.customer_name),
      version: 1,
      version_history: [],
      status: 'Draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      converted_booking_id: undefined,
    };

    this.data.quotations.unshift(newQuote);
    this.save();
    return newQuote;
  }

  public updateQuotationStatus(id: string, status: Quotation['status']): Quotation {
    const quote = this.data.quotations.find((q) => q.id === id);
    if (!quote) throw new Error('Quotation not found');
    quote.status = status;
    quote.updated_at = new Date().toISOString();
    this.save();
    return quote;
  }

  // --- Confirm Booking Workflow (Requirement #13 & #14) ---
  // Quotation Created -> Quotation Sent -> Customer Pays -> Admin Verifies -> MARK AS PAID -> CONFIRM BOOKING
  // Generates Booking ID (BK-2026-XXXXX), Invoice ID (INV-2026-XXXXX), reserves equipment, updates daily schedule.
  public confirmBookingFromQuotation(
    quotationId: string,
    paymentDetails?: {
      amount: number;
      payment_type?: PaymentType;
      payment_method: PaymentMethod;
      transaction_reference?: string;
      reference_number?: string;
      payment_notes?: string;
      notes?: string;
      payment_date?: string;
      payment_proof_name?: string;
      payment_proof_url?: string;
      created_by?: string;
    }
  ): { booking: Booking; invoice: Invoice; payment: Payment } {
    const quotation = this.getQuotation(quotationId);
    if (!quotation) throw new Error('Quotation not found');

    const amountPaidNow = Number(paymentDetails?.amount ?? 0);
    if (isNaN(amountPaidNow) || amountPaidNow <= 0) {
      throw new Error('Please enter a valid payment amount greater than zero.');
    }

    // Existing payments associated with this quotation or booking
    const existingPayments = this.data.payments.filter(
      (p) => p.quotation_id === quotation.id || (quotation.converted_booking_id && p.booking_id === quotation.converted_booking_id)
    );
    const alreadyPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);
    const newTotalPaid = alreadyPaid + amountPaidNow;

    const requiredDeposit = Number(
      quotation.deposit_required || Math.round(quotation.total_amount * 0.5)
    );

    // Strict validation: Must reach required deposit to confirm booking
    if (newTotalPaid < requiredDeposit) {
      throw new Error(
        'Required deposit has not been reached. Please enter a valid payment amount.'
      );
    }

    // Check inventory availability considering date AND event time window overlap
    for (const item of quotation.items) {
      const prod = this.getProduct(item.product_id);
      const totalStock = prod ? prod.total_quantity : 1;

      // Overlapping active bookings for the same product on the same date
      const overlappingBookings = this.data.bookings.filter((b) => {
        if (b.id === quotation.converted_booking_id) return false;
        if (b.event_date !== quotation.event_date) return false;
        if (b.status === 'Cancelled') return false;

        const startA = quotation.event_start_time || '00:00';
        const endA = quotation.event_end_time || '23:59';
        const startB = b.event_start_time || '00:00';
        const endB = b.event_end_time || '23:59';

        // Overlap condition: startA < endB && endA > startB
        return startA < endB && endA > startB;
      });

      const bookedInWindow = overlappingBookings.reduce((sum, b) => {
        const it = b.items.find((bi) => bi.product_id === item.product_id);
        return sum + (it ? it.quantity : 0);
      }, 0);

      const availableInWindow = totalStock - bookedInWindow;
      if (item.quantity > availableInWindow) {
        throw new Error(
          `Cannot confirm booking: ${item.quantity}x "${item.product_name_snapshot}" requested, but only ${Math.max(
            0,
            availableInWindow
          )} available during ${quotation.event_start_time}–${quotation.event_end_time} on ${quotation.event_date}.`
        );
      }
    }

    // 1. Generate unique sequential Booking Number: BK-2026-00001
    this.data.counters.booking += 1;
    const year = new Date().getFullYear();
    const bookingSeq = String(this.data.counters.booking).padStart(5, '0');
    const booking_number = `BK-${year}-${bookingSeq}`;

    // 2. Generate unique sequential Invoice Number: INV-2026-00001
    this.data.counters.invoice += 1;
    const invoiceSeq = String(this.data.counters.invoice).padStart(5, '0');
    const invoice_number = `INV-${year}-${invoiceSeq}`;

    const bookingId = quotation.converted_booking_id || `bk_${Date.now()}`;
    const totalAmount = quotation.total_amount;
    const remainingBalance = Math.max(0, totalAmount - newTotalPaid);

    let paymentStatus: PaymentStatus = 'Deposit Paid';
    if (newTotalPaid >= totalAmount) {
      paymentStatus = 'Fully Paid';
    } else if (newTotalPaid >= requiredDeposit) {
      paymentStatus = 'Deposit Paid';
    } else if (newTotalPaid > 0) {
      paymentStatus = 'Partially Paid';
    } else {
      paymentStatus = 'Unpaid';
    }

    const bookingStatus: BookingStatus = 'Confirmed';

    const booking: Booking = {
      id: bookingId,
      booking_number,
      quotation_id: quotation.id,
      quotation_number: quotation.quotation_number,
      accepted_quotation_version: quotation.version || 1,
      customer_id: quotation.customer_id,
      customer_name: quotation.customer_name,
      customer_phone: quotation.customer_phone,
      customer_whatsapp: quotation.customer_whatsapp,
      customer_email: quotation.customer_email,
      customer_address: quotation.customer_address,
      event_date: quotation.event_date,
      event_start_time: quotation.event_start_time,
      event_end_time: quotation.event_end_time,
      event_duration_minutes: quotation.event_duration_minutes,
      event_duration_formatted: quotation.event_duration_formatted,
      included_hours: quotation.included_hours ?? 3,
      additional_hours: quotation.additional_hours ?? 0,
      event_location: quotation.event_location,
      event_type: quotation.event_type,
      number_of_guests: quotation.number_of_guests,
      special_requirements: quotation.special_requirements,
      notes: quotation.notes,
      items: JSON.parse(JSON.stringify(quotation.items)),
      subtotal: quotation.subtotal,
      delivery_fee: quotation.delivery_fee,
      setup_fee: quotation.setup_fee,
      transport_fee: quotation.transport_fee,
      other_charges: quotation.other_charges,
      discount: quotation.discount,
      total_amount: quotation.total_amount,
      deposit_required: quotation.deposit_required,
      amount_paid: newTotalPaid,
      balance: remainingBalance,
      status: bookingStatus,
      booking_status: bookingStatus,
      payment_status: paymentStatus,
      confirmed_at: new Date().toISOString(),
      confirmed_by: paymentDetails?.created_by || 'Admin (Staff)',
      invoice_number,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 3. Create Invoice Record
    const invoice: Invoice = {
      id: `inv_${Date.now()}`,
      invoice_number,
      booking_id: bookingId,
      booking_number,
      quotation_id: quotation.id,
      customer_id: quotation.customer_id,
      customer_name: quotation.customer_name,
      customer_phone: quotation.customer_phone,
      customer_email: quotation.customer_email,
      customer_address: quotation.customer_address,
      event_date: quotation.event_date,
      event_location: quotation.event_location,
      items: JSON.parse(JSON.stringify(quotation.items)),
      subtotal: quotation.subtotal,
      delivery_fee: quotation.delivery_fee,
      setup_fee: quotation.setup_fee,
      transport_fee: quotation.transport_fee,
      other_charges: quotation.other_charges,
      discount: quotation.discount,
      total: quotation.total_amount,
      amount_paid: newTotalPaid,
      balance: remainingBalance,
      payment_method: paymentDetails?.payment_method || 'Bank Transfer',
      payment_date: paymentDetails?.payment_date || new Date().toISOString().split('T')[0],
      status: paymentStatus === 'Fully Paid' ? 'Paid' : 'Partially Paid',
      created_at: new Date().toISOString(),
    };

    // 4. Record Payment as a separate tracked record
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const paymentRecord: Payment = {
      id: paymentId,
      booking_id: bookingId,
      booking_number,
      quotation_id: quotation.id,
      customer_id: quotation.customer_id,
      customer_name: quotation.customer_name,
      amount: amountPaidNow,
      payment_type:
        paymentDetails?.payment_type ||
        (newTotalPaid >= totalAmount ? 'Full Payment' : 'Deposit'),
      payment_method: paymentDetails?.payment_method || 'Bank Transfer',
      payment_date:
        paymentDetails?.payment_date || new Date().toISOString().split('T')[0],
      transaction_reference:
        paymentDetails?.transaction_reference ||
        paymentDetails?.reference_number ||
        `TXN-${Date.now().toString().slice(-6)}`,
      reference_number:
        paymentDetails?.reference_number ||
        paymentDetails?.transaction_reference ||
        `TXN-${Date.now().toString().slice(-6)}`,
      payment_notes:
        paymentDetails?.payment_notes ||
        paymentDetails?.notes ||
        'Advance deposit verified on booking confirmation',
      notes:
        paymentDetails?.notes ||
        paymentDetails?.payment_notes ||
        'Advance deposit verified on booking confirmation',
      payment_proof_name: paymentDetails?.payment_proof_name,
      payment_proof_url:
        paymentDetails?.payment_proof_url || paymentDetails?.payment_proof_name,
      payment_status: paymentStatus,
      created_at: new Date().toISOString(),
      created_by: paymentDetails?.created_by || 'Admin (Staff)',
    };
    this.data.payments.unshift(paymentRecord);

    // 5. Update Daily Schedule with unique combination booking_id + product_id
    for (const item of booking.items) {
      const scheduleId = `${booking.id}_${item.product_id}`;
      // Remove any previous record if exists
      this.data.daily_schedule = this.data.daily_schedule.filter((s) => s.id !== scheduleId);
      this.data.daily_schedule.push({
        id: scheduleId,
        event_date: booking.event_date,
        customer_name: booking.customer_name,
        customer_phone: booking.customer_phone,
        location: booking.event_location,
        product_id: item.product_id,
        item_name: item.product_name_snapshot,
        quantity: item.quantity,
        start_time: booking.event_start_time,
        end_time: booking.event_end_time,
        booking_id: booking.id,
        booking_number: booking.booking_number,
        status: 'Confirmed',
        updated_at: new Date().toISOString(),
      });
    }

    // 6. Update Quotation status, payment status, paid amount, and reference
    quotation.status = 'Confirmed';
    quotation.payment_status = paymentStatus;
    quotation.amount_paid = newTotalPaid;
    quotation.total_paid = newTotalPaid;
    quotation.remaining_balance = remainingBalance;
    quotation.converted_booking_id = booking.id;
    quotation.updated_at = new Date().toISOString();

    // 7. Save into bookings and invoices
    // If existing booking already in array, replace it, else unshift
    const existingBkIdx = this.data.bookings.findIndex((b) => b.id === booking.id);
    if (existingBkIdx >= 0) {
      this.data.bookings[existingBkIdx] = booking;
    } else {
      this.data.bookings.unshift(booking);
    }

    const existingInvIdx = this.data.invoices.findIndex((i) => i.booking_id === booking.id);
    if (existingInvIdx >= 0) {
      this.data.invoices[existingInvIdx] = invoice;
    } else {
      this.data.invoices.unshift(invoice);
    }

    this.save();

    return { booking, invoice, payment: paymentRecord };
  }

  // --- Bookings ---
  public getBookings(): Booking[] {
    return this.data.bookings;
  }

  public getBooking(id: string): Booking | undefined {
    return this.data.bookings.find((b) => b.id === id || b.booking_number === id);
  }

  // Cancellation Logic (Requirement #22)
  public cancelBooking(id: string, reason?: string): Booking {
    const booking = this.data.bookings.find((b) => b.id === id);
    if (!booking) throw new Error('Booking not found');

    booking.status = 'Cancelled';
    booking.notes = (booking.notes ? booking.notes + '\n' : '') + `[Cancelled on ${new Date().toLocaleDateString()}]: ${reason || 'Admin cancelled'}`;
    booking.updated_at = new Date().toISOString();

    // Update Daily Schedule entries to Cancelled so equipment is instantly freed
    this.data.daily_schedule.forEach((s) => {
      if (s.booking_id === booking.id) {
        s.status = 'Cancelled';
        s.updated_at = new Date().toISOString();
      }
    });

    this.save();
    return booking;
  }

  // Edit Confirmed Booking (Requirement #23: Re-check availability)
  public updateBooking(id: string, updates: Partial<Booking>): Booking {
    const booking = this.data.bookings.find((b) => b.id === id);
    if (!booking) throw new Error('Booking not found');

    const targetDate = updates.event_date || booking.event_date;
    const targetItems = updates.items || booking.items;

    // Check availability if date or items changed
    if (updates.event_date !== undefined || updates.items !== undefined) {
      // Get availability on target date excluding current booking
      const otherBookings = this.data.bookings.filter(
        (b) => b.id !== booking.id && b.event_date === targetDate && b.status !== 'Cancelled'
      );
      const bookedMap = new Map<string, number>();
      for (const ob of otherBookings) {
        for (const it of ob.items) {
          bookedMap.set(it.product_id, (bookedMap.get(it.product_id) || 0) + it.quantity);
        }
      }

      for (const it of targetItems) {
        const prod = this.getProduct(it.product_id);
        const total = prod?.total_quantity || 0;
        const alreadyBooked = bookedMap.get(it.product_id) || 0;
        const available = total - alreadyBooked;
        if (it.quantity > available) {
          throw new Error(
            `Cannot update booking: Requested ${it.quantity} units of "${it.product_name_snapshot}", but only ${available} are available on ${targetDate}.`
          );
        }
      }
    }

    Object.assign(booking, updates, { updated_at: new Date().toISOString() });

    // Update Daily Schedule entries
    for (const item of booking.items) {
      const scheduleId = `${booking.id}_${item.product_id}`;
      this.data.daily_schedule = this.data.daily_schedule.filter((s) => s.id !== scheduleId);
      if (booking.status !== 'Cancelled') {
        this.data.daily_schedule.push({
          id: scheduleId,
          event_date: booking.event_date,
          customer_name: booking.customer_name,
          customer_phone: booking.customer_phone,
          location: booking.event_location,
          product_id: item.product_id,
          item_name: item.product_name_snapshot,
          quantity: item.quantity,
          start_time: booking.event_start_time,
          end_time: booking.event_end_time,
          booking_id: booking.id,
          booking_number: booking.booking_number,
          status: booking.status,
          updated_at: new Date().toISOString(),
        });
      }
    }

    this.save();
    return booking;
  }

  public markBookingCompleted(id: string): Booking {
    const booking = this.data.bookings.find((b) => b.id === id);
    if (!booking) throw new Error('Booking not found');

    booking.status = 'Completed';
    booking.updated_at = new Date().toISOString();

    this.data.daily_schedule.forEach((s) => {
      if (s.booking_id === booking.id) {
        s.status = 'Completed';
        s.updated_at = new Date().toISOString();
      }
    });

    this.save();
    return booking;
  }

  public generateInvoiceForBooking(bookingId: string): Invoice {
    const booking = this.data.bookings.find((b) => b.id === bookingId);
    if (!booking) throw new Error('Booking not found');

    // Return existing invoice if already generated
    const existing = this.data.invoices.find((i) => i.booking_id === booking.id);
    if (existing) return existing;

    this.data.counters.invoice += 1;
    const year = new Date().getFullYear();
    const invoiceSeq = String(this.data.counters.invoice).padStart(5, '0');
    const invoice_number = `INV-${year}-${invoiceSeq}`;

    const invoice: Invoice = {
      id: `inv_${Date.now()}`,
      invoice_number,
      booking_id: booking.id,
      booking_number: booking.booking_number,
      quotation_id: booking.quotation_id,
      customer_id: booking.customer_id,
      customer_name: booking.customer_name,
      customer_phone: booking.customer_phone,
      customer_email: booking.customer_email,
      customer_address: booking.customer_address,
      event_date: booking.event_date,
      event_location: booking.event_location,
      items: JSON.parse(JSON.stringify(booking.items)),
      subtotal: booking.subtotal,
      delivery_fee: booking.delivery_fee,
      setup_fee: booking.setup_fee,
      transport_fee: booking.transport_fee,
      other_charges: booking.other_charges,
      discount: booking.discount,
      total: booking.total_amount,
      amount_paid: booking.amount_paid,
      balance: booking.balance,
      payment_method: 'Bank Transfer',
      payment_date: new Date().toISOString().split('T')[0],
      status: booking.payment_status === 'Paid' ? 'Paid' : booking.payment_status === 'Partially Paid' ? 'Partially Paid' : 'Unpaid',
      created_at: new Date().toISOString(),
    };

    booking.invoice_number = invoice_number;
    booking.updated_at = new Date().toISOString();

    this.data.invoices.unshift(invoice);
    this.save();
    return invoice;
  }

  // --- Payments (Requirement #12) ---
  public getPayments(): Payment[] {
    return this.data.payments;
  }

  public recordPayment(input: {
    booking_id: string;
    amount: number;
    payment_method: Payment['payment_method'];
    payment_date: string;
    transaction_reference: string;
    payment_notes?: string;
    payment_proof_name?: string;
    payment_proof_data?: string;
  }): Payment {
    const booking = this.data.bookings.find((b) => b.id === input.booking_id);
    if (!booking) throw new Error('Booking not found');

    const payment: Payment = {
      id: `pay_${Date.now()}`,
      booking_id: booking.id,
      booking_number: booking.booking_number,
      quotation_id: booking.quotation_id,
      amount: Number(input.amount),
      payment_date: input.payment_date,
      payment_method: input.payment_method,
      transaction_reference: input.transaction_reference,
      payment_notes: input.payment_notes || '',
      payment_proof_name: input.payment_proof_name,
      payment_proof_data: input.payment_proof_data,
      payment_status: 'Paid',
      created_at: new Date().toISOString(),
    };

    this.data.payments.unshift(payment);

    // Update booking financials
    const allBookingPayments = this.data.payments.filter((p) => p.booking_id === booking.id);
    const totalPaid = allBookingPayments.reduce((sum, p) => sum + p.amount, 0);
    booking.amount_paid = totalPaid;
    booking.balance = Math.max(0, booking.total_amount - totalPaid);
    booking.payment_status =
      booking.balance === 0 ? 'Paid' : totalPaid > 0 ? 'Partially Paid' : 'Unpaid';
    booking.updated_at = new Date().toISOString();

    // Update invoice if exists
    const invoice = this.data.invoices.find((i) => i.booking_id === booking.id);
    if (invoice) {
      invoice.amount_paid = totalPaid;
      invoice.balance = booking.balance;
      invoice.status = booking.payment_status === 'Paid' ? 'Paid' : 'Partially Paid';
      invoice.payment_method = input.payment_method;
      invoice.payment_date = input.payment_date;
    }

    this.save();
    return payment;
  }

  // --- Invoices ---
  public getInvoices(): Invoice[] {
    return this.data.invoices;
  }

  public getInvoice(id: string): Invoice | undefined {
    return this.data.invoices.find((i) => i.id === id || i.invoice_number === id);
  }

  // --- Daily Schedule (Requirement #17, #19, #20) ---
  public getDailySchedule(date?: string): DailyScheduleEntry[] {
    if (date) {
      return this.data.daily_schedule.filter(
        (s) => s.event_date === date && s.status !== 'Cancelled'
      );
    }
    return this.data.daily_schedule.filter((s) => s.status !== 'Cancelled');
  }

  // Returns equipment breakdown for a single day: e.g. Large Bouncy Castle: 2, Generator: 2, Chairs: 80
  public getDailyEquipmentSummary(date: string) {
    const scheduleItems = this.getDailySchedule(date);
    const summaryMap = new Map<string, { product_id: string; item_name: string; total_quantity: number; bookings_count: number; bookings: Array<{ booking_number: string; customer_name: string; location: string; time: string; qty: number }> }>();

    for (const item of scheduleItems) {
      const existing = summaryMap.get(item.product_id);
      if (!existing) {
        summaryMap.set(item.product_id, {
          product_id: item.product_id,
          item_name: item.item_name,
          total_quantity: item.quantity,
          bookings_count: 1,
          bookings: [
            {
              booking_number: item.booking_number,
              customer_name: item.customer_name,
              location: item.location,
              time: `${item.start_time} - ${item.end_time}`,
              qty: item.quantity,
            },
          ],
        });
      } else {
        existing.total_quantity += item.quantity;
        existing.bookings_count += 1;
        existing.bookings.push({
          booking_number: item.booking_number,
          customer_name: item.customer_name,
          location: item.location,
          time: `${item.start_time} - ${item.end_time}`,
          qty: item.quantity,
        });
      }
    }

    return Array.from(summaryMap.values());
  }

  // --- Multi-Sheet Excel Workbook Export (Requirements #17 & #18) ---
  // Sheet 1: Daily Schedule (All confirmed bookings organized by date)
  // Sheet 2: Equipment Schedule (Equipment grouped by item)
  // Sheet 3: Upcoming Events (Upcoming confirmed bookings)
  // Sheet 4: Customers (Customer directory)
  // Sheet 5: Payments (Payment records)
  public generateExcelWorkbookBuffer(): Buffer {
    const wb = XLSX.utils.book_new();

    // Sheet 1 — Daily Schedule
    const sheet1Data = this.data.daily_schedule
      .filter((s) => s.status !== 'Cancelled')
      .sort((a, b) => a.event_date.localeCompare(b.event_date))
      .map((s) => ({
        'Event Date': s.event_date,
        Item: s.item_name,
        Qty: s.quantity,
        Customer: s.customer_name,
        Phone: s.customer_phone,
        Location: s.location,
        'Start Time': s.start_time,
        'End Time': s.end_time,
        'Booking No': s.booking_number,
        Status: s.status,
      }));
    const ws1 = XLSX.utils.json_to_sheet(
      sheet1Data.length > 0
        ? sheet1Data
        : [{ 'Event Date': 'No bookings', Item: '', Qty: '', Customer: '', Phone: '', Location: '', 'Start Time': '', 'End Time': '', 'Booking No': '', Status: '' }]
    );
    XLSX.utils.book_append_sheet(wb, ws1, 'Daily Schedule');

    // Sheet 2 — Equipment Schedule (grouped by item)
    const sheet2Map = new Map<string, Array<{ date: string; booking: string; customer: string; location: string; qty: number }>>();
    for (const s of this.data.daily_schedule.filter((x) => x.status !== 'Cancelled')) {
      const list = sheet2Map.get(s.item_name) || [];
      list.push({
        date: s.event_date,
        booking: s.booking_number,
        customer: s.customer_name,
        location: s.location,
        qty: s.quantity,
      });
      sheet2Map.set(s.item_name, list);
    }
    const sheet2Rows: any[] = [];
    sheet2Map.forEach((assignments, itemName) => {
      const totalAllocated = assignments.reduce((acc, a) => acc + a.qty, 0);
      assignments.forEach((a, idx) => {
        sheet2Rows.push({
          'Equipment Name': idx === 0 ? itemName : '',
          'Total Allocated': idx === 0 ? totalAllocated : '',
          'Event Date': a.date,
          'Booking No': a.booking,
          Customer: a.customer,
          Location: a.location,
          'Assigned Qty': a.qty,
        });
      });
    });
    const ws2 = XLSX.utils.json_to_sheet(
      sheet2Rows.length > 0 ? sheet2Rows : [{ 'Equipment Name': 'No data' }]
    );
    XLSX.utils.book_append_sheet(wb, ws2, 'Equipment Schedule');

    // Sheet 3 — Upcoming Events
    const sheet3Data = this.data.bookings
      .filter((b) => b.status !== 'Cancelled')
      .sort((a, b) => a.event_date.localeCompare(b.event_date))
      .map((b) => ({
        'Booking No': b.booking_number,
        'Event Date': b.event_date,
        Time: `${b.event_start_time} - ${b.event_end_time}`,
        Customer: b.customer_name,
        Phone: b.customer_phone,
        Location: b.event_location,
        'Event Type': b.event_type,
        'Total Amount (Rs.)': b.total_amount,
        'Paid (Rs.)': b.amount_paid,
        'Balance (Rs.)': b.balance,
        Status: b.status,
        'Payment Status': b.payment_status,
      }));
    const ws3 = XLSX.utils.json_to_sheet(sheet3Data.length > 0 ? sheet3Data : [{ 'Booking No': 'No events' }]);
    XLSX.utils.book_append_sheet(wb, ws3, 'Upcoming Events');

    // Sheet 4 — Customers
    const sheet4Data = this.data.customers.map((c) => {
      const totalBookings = this.data.bookings.filter((b) => b.customer_id === c.id).length;
      return {
        'Customer Name': c.name,
        Phone: c.phone,
        WhatsApp: c.whatsapp,
        Email: c.email,
        Address: c.address,
        'Total Bookings': totalBookings,
        'Joined Date': c.created_at.split('T')[0],
      };
    });
    const ws4 = XLSX.utils.json_to_sheet(sheet4Data.length > 0 ? sheet4Data : [{ 'Customer Name': 'No customers' }]);
    XLSX.utils.book_append_sheet(wb, ws4, 'Customers');

    // Sheet 5 — Payments
    const sheet5Data = this.data.payments.map((p) => ({
      'Payment Date': p.payment_date,
      'Booking No': p.booking_number,
      'Amount (Rs.)': p.amount,
      Method: p.payment_method,
      'Reference / TxID': p.transaction_reference,
      Status: p.payment_status,
      Notes: p.payment_notes,
    }));
    const ws5 = XLSX.utils.json_to_sheet(sheet5Data.length > 0 ? sheet5Data : [{ 'Payment Date': 'No payments' }]);
    XLSX.utils.book_append_sheet(wb, ws5, 'Payments');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  // --- Template Settings (Requirement #10 & #15) ---
  public getTemplateSettings(): CompanyTemplateSettings {
    return this.data.template_settings;
  }

  public updateTemplateSettings(settings: Partial<CompanyTemplateSettings>): CompanyTemplateSettings {
    this.data.template_settings = { ...this.data.template_settings, ...settings };
    this.save();
    return this.data.template_settings;
  }

  // --- Dashboard Stats (Requirement #24) ---
  public getStats(): DashboardStats {
    const todayStr = new Date().toISOString().split('T')[0];

    const todaysEvents = this.data.bookings.filter(
      (b) => b.event_date === todayStr && b.status !== 'Cancelled'
    );
    const upcomingEvents = this.data.bookings.filter(
      (b) => b.event_date >= todayStr && b.status !== 'Cancelled'
    );
    const pendingQuotations = this.data.quotations.filter(
      (q) => q.status === 'Draft' || q.status === 'Sent' || q.status === 'Awaiting Payment'
    );
    const unpaidQuotations = this.data.quotations.filter((q) => q.status === 'Awaiting Payment');
    const confirmedBookings = this.data.bookings.filter((b) => b.status === 'Confirmed');

    // Today's equipment sum
    const todaysEquipment = this.data.daily_schedule
      .filter((s) => s.event_date === todayStr && s.status !== 'Cancelled')
      .reduce((sum, s) => sum + s.quantity, 0);

    // Outstanding payments across non-cancelled bookings
    const outstandingPayments = this.data.bookings
      .filter((b) => b.status !== 'Cancelled')
      .reduce((sum, b) => sum + b.balance, 0);

    // Monthly revenue: sum of payments made in current month
    const currentMonthPrefix = todayStr.substring(0, 7); // YYYY-MM
    const monthlyRevenue = this.data.payments
      .filter((p) => p.payment_date.startsWith(currentMonthPrefix))
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      todays_events_count: todaysEvents.length,
      upcoming_events_count: upcomingEvents.length,
      pending_quotations_count: pendingQuotations.length,
      unpaid_quotations_count: unpaidQuotations.length,
      confirmed_bookings_count: confirmedBookings.length,
      todays_equipment_count: todaysEquipment,
      outstanding_payments_amount: outstandingPayments,
      monthly_revenue_amount: monthlyRevenue,
    };
  }

  // --- Global Search (Requirement #25) ---
  public search(query: string) {
    const q = query.trim().toLowerCase();
    if (!q) return { customers: [], quotations: [], bookings: [], invoices: [], products: [] };

    const customers = this.data.customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.email.toLowerCase().includes(q)
    );
    const quotations = this.data.quotations.filter(
      (qt) =>
        (qt.quotation_number || qt.quote_number || '').toLowerCase().includes(q) ||
        (qt.quote_name || '').toLowerCase().includes(q) ||
        qt.customer_name.toLowerCase().includes(q) ||
        (qt.customer_phone || '').toLowerCase().includes(q) ||
        qt.event_location.toLowerCase().includes(q) ||
        qt.event_date.includes(q)
    );
    const bookings = this.data.bookings.filter(
      (b) =>
        b.booking_number.toLowerCase().includes(q) ||
        b.customer_name.toLowerCase().includes(q) ||
        b.event_location.toLowerCase().includes(q) ||
        b.event_date.includes(q)
    );
    const invoices = this.data.invoices.filter(
      (i) =>
        i.invoice_number.toLowerCase().includes(q) ||
        i.customer_name.toLowerCase().includes(q) ||
        i.booking_number.toLowerCase().includes(q)
    );
    const products = this.data.products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    );

    return { customers, quotations, bookings, invoices, products };
  }
}

export const db = new DatabaseStore();
