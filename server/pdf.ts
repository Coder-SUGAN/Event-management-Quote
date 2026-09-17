import { jsPDF } from 'jspdf';
import type { Quotation, Invoice, CompanyTemplateSettings } from '../src/types.ts';

function hexToRgb(hex?: string): [number, number, number] {
  if (!hex) return [225, 29, 72]; // default rose-600
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16),
    ];
  }
  if (clean.length === 6) {
    return [
      parseInt(clean.slice(0, 2), 16) || 225,
      parseInt(clean.slice(2, 4), 16) || 29,
      parseInt(clean.slice(4, 6), 16) || 72,
    ];
  }
  return [225, 29, 72];
}

function formatRs(amount?: number): string {
  const val = Number(amount || 0);
  return `Rs. ${val.toLocaleString('en-US')}`;
}

export function generateQuotationPdfBuffer(
  quote: Quotation,
  settings: CompanyTemplateSettings
): Buffer {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor = hexToRgb(settings.primary_color);
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  // Top color accent band
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 5, 'F');

  let y = 14;

  // Company logo / initials icon
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.roundedRect(margin, y, 10, 10, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('KJ', margin + 2.5, y + 6.8);

  // Company details
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(settings.company_name || 'Kids Jump 4 Joy', margin + 13, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(settings.tagline || 'Bouncy Castles & Party Equipment Rentals', margin + 13, y + 9);

  // Right-aligned Document Title & Metadata
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(settings.quotation_header || 'EVENT QUOTATION', pageWidth - margin, y + 4, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  const quoteNumber = quote.quote_number || quote.quotation_number || 'QUOTATION';
  doc.text(`Ref: ${quoteNumber}`, pageWidth - margin, y + 9, { align: 'right' });

  y += 14;

  // Company contacts (small block)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`${settings.address || 'Kurunegala, Sri Lanka'}  |  Hotline/WhatsApp: ${settings.phone || '+94 77 123 4567'}`, margin, y);
  y += 3.5;
  doc.text(`Email: ${settings.email || 'info@kidsjump4joy.lk'}${settings.reg_number ? `  |  Reg: ${settings.reg_number}` : ''}`, margin, y);

  // Right-side Date info
  const quoteDate = quote.created_at ? quote.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
  doc.text(`Issued Date: ${quoteDate}   |   Valid Until: ${quote.valid_until || '7 Days'}`, pageWidth - margin, y, { align: 'right' });

  y += 5;
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  // Quotation Name Banner if present
  const quoteName = quote.quote_name || `${quote.event_date} - ${quote.customer_name}`;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 7, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Quotation Name:', margin + 3, y + 4.8);
  doc.setTextColor(15, 23, 42);
  doc.text(quoteName, margin + 28, y + 4.8);
  y += 10;

  // Customer & Event Info Boxes (2 column card)
  const boxWidth = (contentWidth - 4) / 2;
  const boxHeight = 30;

  // Left: Customer Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, boxWidth, boxHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('CUSTOMER DETAILS', margin + 3.5, y + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(quote.customer_name || 'N/A', margin + 3.5, y + 9.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Phone / WhatsApp: ${quote.customer_phone || quote.customer_whatsapp || '—'}`, margin + 3.5, y + 14);
  if (quote.customer_email) {
    doc.text(`Email: ${quote.customer_email}`, margin + 3.5, y + 18);
  }
  if (quote.customer_address) {
    const splitAddr = doc.splitTextToSize(`Address: ${quote.customer_address}`, boxWidth - 7);
    doc.text(splitAddr, margin + 3.5, y + (quote.customer_email ? 22 : 18));
  }

  // Right: Event Details Box
  const rightBoxX = margin + boxWidth + 4;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(rightBoxX, y, boxWidth, boxHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('EVENT DETAILS & TIMING', rightBoxX + 3.5, y + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Event Date: ${quote.event_date}`, rightBoxX + 3.5, y + 9.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const timeStr = `${quote.event_start_time || '14:00'} - ${quote.event_end_time || '17:00'}`;
  doc.text(`Time: ${timeStr}`, rightBoxX + 3.5, y + 14);

  const durationStr = quote.event_duration_formatted || `${(quote.included_hours || 3) + (quote.additional_hours || 0)} Hours`;
  const addHoursNote = (quote.additional_hours || 0) > 0
    ? ` (${quote.included_hours || 3}h included + ${quote.additional_hours} additional hrs)`
    : ' (3h standard included)';
  doc.text(`Duration: ${durationStr}${addHoursNote}`, rightBoxX + 3.5, y + 18);

  const locationText = doc.splitTextToSize(`Location: ${quote.event_location || 'Customer Venue'}`, boxWidth - 7);
  doc.text(locationText, rightBoxX + 3.5, y + 22);

  if (quote.event_type) {
    doc.text(`Type: ${quote.event_type}`, rightBoxX + 3.5, y + 26);
  }

  y += boxHeight + 4;

  // Pricing policy badge
  doc.setFillColor(254, 243, 199); // amber-100
  doc.setDrawColor(251, 191, 36); // amber-400
  doc.roundedRect(margin, y, contentWidth, 6, 1, 1, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(146, 64, 14); // amber-800
  doc.text('PRICING POLICY: Equipment rental includes up to 3 hours of operation. Usage beyond 3 hours incurs hourly rates.', margin + 3, y + 4.2);

  y += 9;

  // Equipment Line Items Table Header
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);

  doc.text('#', margin + 3, y + 4.8);
  doc.text('Item Description & Duration', margin + 10, y + 4.8);
  doc.text('Qty', margin + 98, y + 4.8, { align: 'center' });
  doc.text('Base Price (3h)', margin + 124, y + 4.8, { align: 'right' });
  doc.text('Addtl Hours', margin + 152, y + 4.8, { align: 'right' });
  doc.text('Item Total', pageWidth - margin - 3, y + 4.8, { align: 'right' });

  y += 7;

  // Table Body Rows
  const items = quote.items || [];
  doc.setFont('helvetica', 'normal');

  items.forEach((item, idx) => {
    // Check page overflow
    if (y > pageHeight - 65) {
      doc.addPage();
      y = 14;
      // Repeat small table header
      doc.setFillColor(30, 41, 59);
      doc.rect(margin, y, contentWidth, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text('Item Description (cont.)', margin + 10, y + 4.2);
      doc.text('Qty', margin + 98, y + 4.2, { align: 'center' });
      doc.text('Total', pageWidth - margin - 3, y + 4.2, { align: 'right' });
      y += 6;
    }

    const rowBg = idx % 2 === 0 ? 255 : 248;
    doc.setFillColor(rowBg, rowBg, rowBg);
    doc.rect(margin, y, contentWidth, 11, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + 11, pageWidth - margin, y + 11);

    // Number
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(String(idx + 1), margin + 3, y + 5);

    // Product Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(item.product_name_snapshot || 'Equipment Item', margin + 10, y + 4.5);

    // Duration breakdown line
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    const addHrs = item.additional_hours || 0;
    const addRate = item.additional_hourly_rate || 0;
    const durationNote = addHrs > 0
      ? `3h base included + ${addHrs}h addtl @ ${formatRs(addRate)}/hr`
      : '3 hours standard duration';
    doc.text(`${item.category ? `${item.category} • ` : ''}${durationNote}`, margin + 10, y + 8.5);

    // Quantity
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(String(item.quantity || 1), margin + 98, y + 5.5, { align: 'center' });

    // Base Price
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const baseP = item.base_price || item.unit_price || 0;
    doc.text(formatRs(baseP), margin + 124, y + 5.5, { align: 'right' });

    // Additional charge
    if (addHrs > 0) {
      doc.setTextColor(180, 83, 9); // amber-700
      doc.text(`+${formatRs(addRate * addHrs * item.quantity)}`, margin + 152, y + 5.5, { align: 'right' });
    } else {
      doc.setTextColor(16, 185, 129); // emerald-500
      doc.text('Included (Rs. 0)', margin + 152, y + 5.5, { align: 'right' });
    }

    // Item Total
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(formatRs(item.total), pageWidth - margin - 3, y + 5.5, { align: 'right' });

    y += 11;
  });

  y += 4;

  // Bottom Section: Payment/Terms on left, Calculations on right
  const leftColW = 105;
  const rightColW = contentWidth - leftColW - 4;
  const rightColX = margin + leftColW + 4;

  // Financial Calculations Summary Card (Right Column)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(rightColX, y, rightColW, 46, 1.5, 1.5, 'FD');

  let calcY = y + 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);

  const addCalcLine = (label: string, value: string, bold = false, color?: [number, number, number]) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    if (color) doc.setTextColor(color[0], color[1], color[2]);
    else doc.setTextColor(71, 85, 105);
    doc.text(label, rightColX + 3.5, calcY);
    doc.text(value, rightColX + rightColW - 3.5, calcY, { align: 'right' });
    calcY += 4.5;
  };

  addCalcLine('Items Subtotal:', formatRs(quote.subtotal));
  if (quote.delivery_fee > 0) addCalcLine('Delivery Fee:', formatRs(quote.delivery_fee));
  if (quote.setup_fee > 0) addCalcLine('Setup & Labor:', formatRs(quote.setup_fee));
  const otherCharges = (quote.transport_fee || 0) + (quote.other_charges || 0);
  if (otherCharges > 0) addCalcLine('Transport / Other:', formatRs(otherCharges));
  if (quote.discount > 0) addCalcLine('Special Discount:', `-${formatRs(quote.discount)}`, false, [225, 29, 72]);

  doc.setDrawColor(203, 213, 225);
  doc.line(rightColX + 3, calcY - 1, rightColX + rightColW - 3, calcY - 1);
  calcY += 1.5;

  // Final Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Final Total:', rightColX + 3.5, calcY);
  doc.text(formatRs(quote.total_amount), rightColX + rightColW - 3.5, calcY, { align: 'right' });
  calcY += 5;

  // Advance Deposit (50%) & Balance
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(180, 83, 9); // amber
  doc.text('Advance Deposit (50%):', rightColX + 3.5, calcY);
  doc.text(formatRs(quote.deposit_required), rightColX + rightColW - 3.5, calcY, { align: 'right' });
  calcY += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Balance on Event Setup:', rightColX + 3.5, calcY);
  doc.text(formatRs(quote.remaining_balance), rightColX + rightColW - 3.5, calcY, { align: 'right' });

  // Bank & Payment Instructions (Left Column)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, leftColW, 46, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('BANK DETAILS & PAYMENT INSTRUCTIONS', margin + 3.5, y + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  const payInstructions = settings.payment_instructions || 'Bank: Commercial Bank PLC\nAccount Name: Kids Jump 4 Joy (Pvt) Ltd\nAccount No: 1000 8923 4410\nBranch: Kurunegala Super Branch';
  const splitPay = doc.splitTextToSize(payInstructions, leftColW - 7);
  doc.text(splitPay, margin + 3.5, y + 8.5);

  // Terms and Conditions snippet
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text('TERMS & CONDITIONS', margin + 3.5, y + 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(100, 116, 139);
  const termsText = settings.quotation_terms || '1. 50% non-refundable advance deposit required to confirm event booking.\n2. Continuous power supply (230V) must be available within 20m of setup area.\n3. Flat grass or smooth surface free of sharp objects required.';
  const splitTerms = doc.splitTextToSize(termsText, leftColW - 7);
  doc.text(splitTerms, margin + 3.5, y + 29.5);

  y += 50;

  // Footer Note
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(settings.quotation_footer || 'Thank you for choosing Kids Jump 4 Joy! We look forward to making your celebration unforgettable.', pageWidth / 2, y, { align: 'center' });
  y += 3;
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text(`Official Document Generated by Kids Jump 4 Joy ERP System • ${quoteNumber}`, pageWidth / 2, y, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
}

export function generateInvoicePdfBuffer(
  invoice: Invoice,
  settings: CompanyTemplateSettings
): Buffer {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor = hexToRgb(settings.primary_color);
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Top color accent band
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 5, 'F');

  let y = 14;

  // Company logo / initials icon
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.roundedRect(margin, y, 10, 10, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('KJ', margin + 2.5, y + 6.8);

  // Company details
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(settings.company_name || 'Kids Jump 4 Joy', margin + 13, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(settings.tagline || 'Bouncy Castles & Party Equipment Rentals', margin + 13, y + 9);

  // Right-aligned Document Title & Metadata
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(settings.invoice_header || 'TAX INVOICE', pageWidth - margin, y + 4, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Invoice No: ${invoice.invoice_number}`, pageWidth - margin, y + 9, { align: 'right' });

  y += 14;

  // Company contacts
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`${settings.address || 'Kurunegala, Sri Lanka'}  |  Hotline: ${settings.phone || '+94 77 123 4567'}`, margin, y);
  y += 3.5;
  doc.text(`Email: ${settings.email || 'info@kidsjump4joy.lk'}${settings.reg_number ? `  |  Reg: ${settings.reg_number}` : ''}`, margin, y);

  // Right-side Date & Status info
  const invDate = invoice.created_at?.split('T')[0] || new Date().toISOString().split('T')[0];
  doc.text(`Date: ${invDate}   |   Booking Ref: ${invoice.booking_number}`, pageWidth - margin, y, { align: 'right' });

  y += 5;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  // Status banner
  const isPaid = invoice.status === 'Paid';
  const isPartial = invoice.status === 'Partially Paid';
  doc.setFillColor(isPaid ? 209 : (isPartial ? 254 : 254), isPaid ? 250 : (isPartial ? 243 : 226), isPaid ? 229 : (isPartial ? 199 : 226));
  doc.roundedRect(margin, y, contentWidth, 7, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(isPaid ? 6 : (isPartial ? 146 : 159), isPaid ? 95 : (isPartial ? 64 : 18), isPaid ? 70 : (isPartial ? 14 : 57));
  doc.text(`PAYMENT STATUS: ${invoice.status.toUpperCase()}`, margin + 3.5, y + 4.8);
  doc.text(`Total: ${formatRs(invoice.total)}  |  Paid: ${formatRs(invoice.amount_paid)}  |  Balance Due: ${formatRs(invoice.balance)}`, pageWidth - margin - 3.5, y + 4.8, { align: 'right' });
  y += 10;

  // Customer & Event Info Boxes
  const boxWidth = (contentWidth - 4) / 2;
  const boxHeight = 28;

  // Left: Customer Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, boxWidth, boxHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('BILLED TO (CUSTOMER)', margin + 3.5, y + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.customer_name || 'N/A', margin + 3.5, y + 9.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Phone: ${invoice.customer_phone || '—'}`, margin + 3.5, y + 14);
  if (invoice.customer_email) doc.text(`Email: ${invoice.customer_email}`, margin + 3.5, y + 18);
  if (invoice.customer_address) {
    const splitAddr = doc.splitTextToSize(`Address: ${invoice.customer_address}`, boxWidth - 7);
    doc.text(splitAddr, margin + 3.5, y + (invoice.customer_email ? 22 : 18));
  }

  // Right: Event Details Box
  const rightBoxX = margin + boxWidth + 4;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(rightBoxX, y, boxWidth, boxHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('EVENT DETAILS & BOOKING', rightBoxX + 3.5, y + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Event Date: ${invoice.event_date}`, rightBoxX + 3.5, y + 9.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Booking Reference: ${invoice.booking_number}`, rightBoxX + 3.5, y + 14);
  const locationText = doc.splitTextToSize(`Venue Location: ${invoice.event_location || 'Customer Venue'}`, boxWidth - 7);
  doc.text(locationText, rightBoxX + 3.5, y + 18);

  y += boxHeight + 5;

  // Equipment Line Items Table Header
  doc.setFillColor(30, 41, 59);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);

  doc.text('#', margin + 3, y + 4.8);
  doc.text('Item Description', margin + 10, y + 4.8);
  doc.text('Qty', margin + 110, y + 4.8, { align: 'center' });
  doc.text('Rate', margin + 140, y + 4.8, { align: 'right' });
  doc.text('Amount', pageWidth - margin - 3, y + 4.8, { align: 'right' });

  y += 7;

  // Table Body Rows
  const items = invoice.items || [];
  doc.setFont('helvetica', 'normal');

  items.forEach((item, idx) => {
    if (y > pageHeight - 65) {
      doc.addPage();
      y = 14;
      doc.setFillColor(30, 41, 59);
      doc.rect(margin, y, contentWidth, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text('Item Description (cont.)', margin + 10, y + 4.2);
      doc.text('Total', pageWidth - margin - 3, y + 4.2, { align: 'right' });
      y += 6;
    }

    const rowBg = idx % 2 === 0 ? 255 : 248;
    doc.setFillColor(rowBg, rowBg, rowBg);
    doc.rect(margin, y, contentWidth, 9, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y + 9, pageWidth - margin, y + 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(String(idx + 1), margin + 3, y + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(item.product_name_snapshot || 'Equipment Item', margin + 10, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(String(item.quantity || 1), margin + 110, y + 5.5, { align: 'center' });

    doc.text(formatRs(item.unit_price), margin + 140, y + 5.5, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text(formatRs(item.total), pageWidth - margin - 3, y + 5.5, { align: 'right' });

    y += 9;
  });

  y += 4;

  // Bottom Section
  const leftColW = 105;
  const rightColW = contentWidth - leftColW - 4;
  const rightColX = margin + leftColW + 4;

  // Financial Calculations Summary Card (Right Column)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(rightColX, y, rightColW, 46, 1.5, 1.5, 'FD');

  let calcY = y + 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);

  const addCalcLine = (label: string, value: string, bold = false, color?: [number, number, number]) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    if (color) doc.setTextColor(color[0], color[1], color[2]);
    else doc.setTextColor(71, 85, 105);
    doc.text(label, rightColX + 3.5, calcY);
    doc.text(value, rightColX + rightColW - 3.5, calcY, { align: 'right' });
    calcY += 4.5;
  };

  addCalcLine('Items Subtotal:', formatRs(invoice.subtotal));
  if (invoice.delivery_fee > 0) addCalcLine('Delivery Fee:', formatRs(invoice.delivery_fee));
  if (invoice.setup_fee > 0) addCalcLine('Setup & Labor:', formatRs(invoice.setup_fee));
  const otherCharges = (invoice.transport_fee || 0) + (invoice.other_charges || 0);
  if (otherCharges > 0) addCalcLine('Transport / Other:', formatRs(otherCharges));
  if (invoice.discount > 0) addCalcLine('Discount:', `-${formatRs(invoice.discount)}`, false, [225, 29, 72]);

  doc.setDrawColor(203, 213, 225);
  doc.line(rightColX + 3, calcY - 1, rightColX + rightColW - 3, calcY - 1);
  calcY += 1.5;

  // Invoice Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Invoice Total:', rightColX + 3.5, calcY);
  doc.text(formatRs(invoice.total), rightColX + rightColW - 3.5, calcY, { align: 'right' });
  calcY += 5;

  // Paid & Balance
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(5, 150, 105); // emerald
  doc.text('Total Amount Paid:', rightColX + 3.5, calcY);
  doc.text(formatRs(invoice.amount_paid), rightColX + rightColW - 3.5, calcY, { align: 'right' });
  calcY += 4.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(invoice.balance > 0 ? 225 : 71, invoice.balance > 0 ? 29 : 85, invoice.balance > 0 ? 72 : 105);
  doc.text('Balance Due:', rightColX + 3.5, calcY);
  doc.text(formatRs(invoice.balance), rightColX + rightColW - 3.5, calcY, { align: 'right' });

  // Bank & Settlement Instructions (Left Column)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, leftColW, 46, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('SETTLEMENT & PAYMENT DETAILS', margin + 3.5, y + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  const payInstructions = settings.payment_instructions || 'Bank: Commercial Bank PLC\nAccount Name: Kids Jump 4 Joy (Pvt) Ltd\nAccount No: 1000 8923 4410\nBranch: Kurunegala Super Branch';
  const splitPay = doc.splitTextToSize(payInstructions, leftColW - 7);
  doc.text(splitPay, margin + 3.5, y + 8.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(15, 23, 42);
  doc.text('INVOICE TERMS', margin + 3.5, y + 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(100, 116, 139);
  const termsText = settings.invoice_terms || '1. Official payment receipt issued upon balance clearance.\n2. Inquiries regarding this invoice should quote the invoice number.\n3. Kids Jump 4 Joy is committed to safe and memorable celebrations.';
  const splitTerms = doc.splitTextToSize(termsText, leftColW - 7);
  doc.text(splitTerms, margin + 3.5, y + 29.5);

  y += 50;

  // Footer Note
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 3.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(settings.invoice_footer || 'Thank you for your business! Kids Jump 4 Joy brings endless joy to every celebration.', pageWidth / 2, y, { align: 'center' });
  y += 3;
  doc.setFontSize(6);
  doc.setTextColor(148, 163, 184);
  doc.text(`Official Tax Invoice Generated by Kids Jump 4 Joy ERP System • ${invoice.invoice_number}`, pageWidth / 2, y, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
}
