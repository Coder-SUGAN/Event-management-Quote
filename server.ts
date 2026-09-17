import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { db } from './server/db.ts';
import { generateQuotationPdfBuffer, generateInvoicePdfBuffer } from './server/pdf.ts';

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware for JSON requests with extended limits for receipts/images
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Kids Jump 4 Joy API', timestamp: new Date().toISOString() });
});

// --- Dashboard Stats ---
app.get('/api/stats', (req, res) => {
  try {
    const stats = db.getStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch dashboard stats' });
  }
});

// --- Global Search ---
app.get('/api/search', (req, res) => {
  try {
    const query = (req.query.q as string) || '';
    const results = db.search(query);
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Search failed' });
  }
});

// --- Products & Equipment Inventory ---
app.get('/api/products', (req, res) => {
  try {
    const products = db.getProducts();
    res.json(products);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/products', (req, res) => {
  try {
    const { name, category, total_quantity, unit_price, additional_hourly_rate, description, dimensions, power_required } = req.body;
    if (!name || total_quantity === undefined || unit_price === undefined) {
      return res.status(400).json({ error: 'Name, total_quantity, and unit_price are required' });
    }
    const product = db.createProduct({
      name,
      category: category || 'General',
      total_quantity: Number(total_quantity),
      unit_price: Number(unit_price),
      additional_hourly_rate: Number(additional_hourly_rate || 0),
      description: description || '',
      dimensions: dimensions || '',
      power_required: power_required || '',
      status: 'active',
    });
    res.status(201).json(product);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/products/:id', (req, res) => {
  try {
    const updated = db.updateProduct(req.params.id, req.body);
    res.json(updated);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

// --- Date-Based Equipment Availability (Requirement #4, #5, #21) ---
app.get('/api/availability', (req, res) => {
  try {
    const date = req.query.date as string;
    if (!date) {
      return res.status(400).json({ error: 'Event date query parameter (YYYY-MM-DD) is required' });
    }
    const availability = db.getAvailabilityForDate(date);
    res.json(availability);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Customers ---
app.get('/api/customers', (req, res) => {
  try {
    res.json(db.getCustomers());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/customers', (req, res) => {
  try {
    const { name, phone, whatsapp, email, address } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }
    const customer = db.createCustomer({
      name,
      phone,
      whatsapp: whatsapp || phone,
      email: email || '',
      address: address || '',
    });
    res.status(201).json(customer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/customers/:id', (req, res) => {
  try {
    const updated = db.updateCustomer(req.params.id, req.body);
    res.json(updated);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

// --- Quotations (Requirement #3, #7, #8, #9, #11) ---
app.get('/api/quotations', (req, res) => {
  try {
    res.json(db.getQuotations());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/quotations/:id', (req, res) => {
  try {
    const quotation = db.getQuotation(req.params.id);
    if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
    res.json(quotation);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/quotations', (req, res) => {
  try {
    const { customer, event, items, charges } = req.body;
    if (!customer?.name || !customer?.phone) {
      return res.status(400).json({ error: 'Customer name and phone number are required' });
    }
    if (!event?.date || !event?.location) {
      return res.status(400).json({ error: 'Event date and location are required' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one equipment item must be selected' });
    }

    const quotation = db.createQuotation({
      customer,
      event,
      items,
      charges: charges || {},
    });

    res.status(201).json(quotation);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/quotations/:id', (req, res) => {
  try {
    const updated = db.editQuotation(req.params.id, req.body);
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/quotations/:id/duplicate', (req, res) => {
  try {
    const duplicated = db.duplicateQuotation(req.params.id);
    res.status(201).json(duplicated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/api/quotations/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });
    const updated = db.updateQuotationStatus(req.params.id, status);
    res.json(updated);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

// --- Quotation PDF Download Endpoint ---
app.get('/api/pdf/quotation/:id', (req, res) => {
  try {
    const quote = db.getQuotation(req.params.id);
    if (!quote) return res.status(404).json({ error: 'Quotation not found' });
    const settings = db.getTemplateSettings();
    const pdfBuffer = generateQuotationPdfBuffer(quote, settings);
    const rawNumber = quote.quote_number || quote.quotation_number || 'Quotation';
    const filename = `${rawNumber}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('PDF Quotation generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate quotation PDF' });
  }
});

// --- Confirm Booking from Quotation (Requirement #13 & #14) ---
app.post('/api/quotations/:id/confirm-booking', (req, res) => {
  try {
    const {
      amount,
      payment_type,
      payment_method,
      transaction_reference,
      reference_number,
      payment_notes,
      notes,
      payment_date,
      payment_proof_name,
      payment_proof_url,
      created_by,
    } = req.body || {};

    const result = db.confirmBookingFromQuotation(req.params.id, {
      amount: Number(amount || 0),
      payment_type,
      payment_method: payment_method || 'Bank Transfer',
      transaction_reference: transaction_reference || reference_number,
      reference_number: reference_number || transaction_reference,
      payment_notes: payment_notes || notes,
      notes: notes || payment_notes,
      payment_date: payment_date || new Date().toISOString().split('T')[0],
      payment_proof_name,
      payment_proof_url,
      created_by: created_by || 'Admin (Staff)',
    });

    res.json({
      message: 'Payment recorded successfully. Booking confirmed.',
      ...result,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// --- Bookings (Requirement #16, #22, #23) ---
app.get('/api/bookings', (req, res) => {
  try {
    res.json(db.getBookings());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/bookings/:id', (req, res) => {
  try {
    const booking = db.getBooking(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/bookings/:id', (req, res) => {
  try {
    const updated = db.updateBooking(req.params.id, req.body);
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/bookings/:id/cancel', (req, res) => {
  try {
    const { reason } = req.body;
    const cancelled = db.cancelBooking(req.params.id, reason);
    res.json({
      message: 'Booking cancelled. Equipment has been released and made available again.',
      booking: cancelled,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/bookings/:id/complete', (req, res) => {
  try {
    const completed = db.markBookingCompleted(req.params.id);
    res.json({
      message: 'Booking marked as completed successfully.',
      booking: completed,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/bookings/:id/generate-invoice', (req, res) => {
  try {
    const invoice = db.generateInvoiceForBooking(req.params.id);
    res.json({
      message: 'Invoice generated successfully.',
      invoice,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// --- Payments (Requirement #12) ---
app.get('/api/payments', (req, res) => {
  try {
    res.json(db.getPayments());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/payments', (req, res) => {
  try {
    const {
      booking_id,
      amount,
      payment_method,
      payment_date,
      transaction_reference,
      payment_notes,
      payment_proof_name,
      payment_proof_data,
    } = req.body;

    if (!booking_id || !amount || !payment_method) {
      return res.status(400).json({ error: 'booking_id, amount, and payment_method are required' });
    }

    const payment = db.recordPayment({
      booking_id,
      amount: Number(amount),
      payment_method,
      payment_date: payment_date || new Date().toISOString().split('T')[0],
      transaction_reference: transaction_reference || `TXN-${Date.now().toString().slice(-6)}`,
      payment_notes,
      payment_proof_name,
      payment_proof_data,
    });

    res.status(201).json(payment);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// --- Invoices (Requirement #14 & #15) ---
app.get('/api/invoices', (req, res) => {
  try {
    res.json(db.getInvoices());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/invoices/:id', (req, res) => {
  try {
    const invoice = db.getInvoice(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    res.json(invoice);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Invoice PDF Download Endpoint ---
app.get('/api/pdf/invoice/:id', (req, res) => {
  try {
    const invoice = db.getInvoice(req.params.id);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    const settings = db.getTemplateSettings();
    const pdfBuffer = generateInvoicePdfBuffer(invoice, settings);
    const filename = `${invoice.invoice_number || 'Invoice'}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('PDF Invoice generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate invoice PDF' });
  }
});

// --- Daily Schedule & Summary (Requirement #17, #19, #20) ---
app.get('/api/schedule/daily', (req, res) => {
  try {
    const date = req.query.date as string | undefined;
    const schedule = db.getDailySchedule(date);
    res.json(schedule);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/schedule/summary', (req, res) => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const summary = db.getDailyEquipmentSummary(date);
    res.json({ date, summary });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- Multi-Sheet Excel Workbook Export (Requirements #17, #18, #28) ---
app.get('/api/schedule/export-excel', (req, res) => {
  try {
    const buffer = db.generateExcelWorkbookBuffer();
    const todayStr = new Date().toISOString().split('T')[0];
    const filename = `KidsJump4Joy_Schedule_${todayStr}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error: any) {
    console.error('Excel generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate Excel schedule' });
  }
});

// --- Custom Templates (Requirements #10, #15, #32) ---
app.get('/api/templates', (req, res) => {
  try {
    res.json(db.getTemplateSettings());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/templates', (req, res) => {
  try {
    const updated = db.updateTemplateSettings(req.body);
    res.json(updated);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Start server with Vite middleware in development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Kids Jump 4 Joy Management Server running at http://localhost:${PORT}`);
  });
}

startServer();
