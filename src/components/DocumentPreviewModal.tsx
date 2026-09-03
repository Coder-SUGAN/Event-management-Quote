import React, { useRef } from 'react';
import { X, Printer, Send, Mail, Download, CheckCircle, Clock } from 'lucide-react';
import type { Quotation, Invoice, CompanyTemplateSettings } from '../types.ts';
import { formatCurrency, generateWhatsAppUrl } from '../lib/api.ts';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: 'quotation' | 'invoice';
  data: Quotation | Invoice | null;
  templateSettings: CompanyTemplateSettings;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  onClose,
  documentType,
  data,
  templateSettings,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !data) return null;

  const isQuote = documentType === 'quotation';
  const quote = isQuote ? (data as Quotation) : null;
  const inv = !isQuote ? (data as Invoice) : null;

  const docNumber = isQuote ? quote?.quotation_number : inv?.invoice_number;
  const docDate = isQuote ? quote?.created_at.split('T')[0] : inv?.created_at.split('T')[0];
  const eventDate = isQuote ? quote?.event_date : inv?.event_date;
  const eventLocation = isQuote ? quote?.event_location : inv?.event_location;
  const customerName = data.customer_name;
  const customerPhone = isQuote ? quote?.customer_phone : inv?.customer_phone;
  const customerEmail = isQuote ? quote?.customer_email : inv?.customer_email;
  const customerAddress = isQuote ? quote?.customer_address : inv?.customer_address;
  const items = data.items || [];
  const subtotal = data.subtotal || 0;
  const deliveryFee = data.delivery_fee || 0;
  const setupFee = data.setup_fee || 0;
  const otherCharges = (data.transport_fee || 0) + (data.other_charges || 0);
  const discount = data.discount || 0;
  const total = isQuote ? quote?.total_amount || 0 : inv?.total || 0;
  const paid = isQuote ? 0 : inv?.amount_paid || 0;
  const balance = isQuote ? quote?.remaining_balance || 0 : inv?.balance || 0;
  const depositReq = isQuote ? quote?.deposit_required || 0 : 0;

  const handlePrint = () => {
    window.print();
  };

  const shareText = isQuote
    ? `Hello ${customerName}! 🎈 Kids Jump 4 Joy has prepared your official event quotation (${docNumber}) for ${eventDate}. Total: ${formatCurrency(total)} (Deposit required: ${formatCurrency(depositReq)}). Please review the details. Thank you!`
    : `Hello ${customerName}! 🎈 Kids Jump 4 Joy official invoice (${docNumber}) for your event on ${eventDate}. Total: ${formatCurrency(total)}, Amount Paid: ${formatCurrency(paid)}, Balance Due: ${formatCurrency(balance)}. Thank you for choosing us!`;

  const waUrl = customerPhone ? generateWhatsAppUrl(customerPhone, shareText) : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-8 print:border-none print:shadow-none print:my-0 print:w-full print:max-w-none">
        {/* Modal Top Control Bar (Hidden on Print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white print:hidden">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 uppercase tracking-wider">
              {isQuote ? 'Quotation Preview' : 'Official Invoice Preview'}
            </span>
            <span className="text-sm text-slate-300 font-mono font-medium">{docNumber}</span>
          </div>
          <div className="flex items-center space-x-2">
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send WhatsApp</span>
              </a>
            )}
            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Body */}
        <div ref={printRef} className="p-8 sm:p-12 text-slate-800 bg-white print:p-6" id="printable-doc">
          {/* Header Block */}
          <div className="flex flex-col sm:flex-row justify-between items-start pb-8 border-b border-slate-200 gap-6">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-xl shadow-md"
                  style={{ backgroundColor: templateSettings.primary_color || '#e11d48' }}
                >
                  KJ
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-slate-900">
                    {templateSettings.company_name}
                  </h1>
                  <p className="text-xs font-medium text-slate-500">{templateSettings.tagline}</p>
                </div>
              </div>
              <div className="text-xs text-slate-600 space-y-0.5 mt-3 leading-relaxed">
                <p>{templateSettings.address}</p>
                <p>Hotline / WhatsApp: <span className="font-semibold text-slate-900">{templateSettings.phone}</span></p>
                <p>Email: {templateSettings.email}</p>
                {templateSettings.reg_number && <p>Business Reg: {templateSettings.reg_number}</p>}
              </div>
            </div>

            <div className="sm:text-right">
              <h2
                className="text-xl font-black uppercase tracking-wider mb-2"
                style={{ color: templateSettings.primary_color || '#e11d48' }}
              >
                {isQuote ? templateSettings.quotation_header : templateSettings.invoice_header}
              </h2>
              <div className="text-xs space-y-1 text-slate-600">
                <p>
                  <span className="text-slate-400">Reference No:</span>{' '}
                  <span className="font-mono font-bold text-slate-900 text-sm">{docNumber}</span>
                </p>
                <p>
                  <span className="text-slate-400">Issued Date:</span>{' '}
                  <span className="font-medium text-slate-800">{docDate}</span>
                </p>
                {isQuote && quote?.valid_until && (
                  <p>
                    <span className="text-slate-400">Valid Until:</span>{' '}
                    <span className="font-medium text-amber-700">{quote.valid_until}</span>
                  </p>
                )}
                {!isQuote && (
                  <div className="inline-block mt-2">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        inv?.status === 'Paid'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : inv?.status === 'Partially Paid'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}
                    >
                      {inv?.status}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Customer & Event Details Box */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8 p-5 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2">Billed To / Customer</p>
              <h3 className="text-base font-bold text-slate-900">{customerName}</h3>
              <p className="text-xs text-slate-600 mt-1">Phone: {customerPhone}</p>
              {customerEmail && <p className="text-xs text-slate-600">Email: {customerEmail}</p>}
              {customerAddress && <p className="text-xs text-slate-600 mt-0.5">Address: {customerAddress}</p>}
            </div>
            <div>
              <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2">Event Specifications</p>
              <p className="text-xs text-slate-700">
                <span className="font-semibold text-slate-900">Event Date:</span> {eventDate}
              </p>
              {isQuote && quote && (
                <p className="text-xs text-slate-700">
                  <span className="font-semibold text-slate-900">Operating Time:</span> {quote.event_start_time} to {quote.event_end_time}
                </p>
              )}
              <p className="text-xs text-slate-700">
                <span className="font-semibold text-slate-900">Venue Location:</span> {eventLocation}
              </p>
              {isQuote && quote?.event_type && (
                <p className="text-xs text-slate-700">
                  <span className="font-semibold text-slate-900">Event Type:</span> {quote.event_type}
                </p>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto mb-8">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-800 text-slate-800">
                  <th className="py-2.5 font-bold">#</th>
                  <th className="py-2.5 font-bold">Equipment / Service Description</th>
                  <th className="py-2.5 font-bold text-center">Qty</th>
                  <th className="py-2.5 font-bold text-right">Unit Rate</th>
                  <th className="py-2.5 font-bold text-right">Discount</th>
                  <th className="py-2.5 font-bold text-right">Amount (LKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/50">
                    <td className="py-3 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3">
                      <p className="font-semibold text-slate-900">{item.product_name_snapshot}</p>
                      {item.category && <p className="text-[11px] text-slate-500">{item.category}</p>}
                    </td>
                    <td className="py-3 text-center font-bold text-slate-800">{item.quantity}</td>
                    <td className="py-3 text-right text-slate-700">{formatCurrency(item.unit_price)}</td>
                    <td className="py-3 text-right text-rose-600">
                      {item.discount > 0 ? `-${formatCurrency(item.discount)}` : '—'}
                    </td>
                    <td className="py-3 text-right font-bold text-slate-900">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Calculation Breakdown */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-8 pt-4 border-t border-slate-200">
            {/* Payment instructions & Bank Details */}
            <div className="w-full sm:w-7/12 space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
                <p className="font-bold text-slate-900 mb-1.5 uppercase tracking-wider text-[11px]">
                  Bank & Payment Instructions
                </p>
                <p className="whitespace-pre-line leading-relaxed text-slate-600">
                  {templateSettings.payment_instructions}
                </p>
              </div>

              {/* Terms & Conditions */}
              <div className="text-[11px] text-slate-500 space-y-1">
                <p className="font-bold text-slate-700 uppercase tracking-wider">
                  Terms & Conditions
                </p>
                <p className="whitespace-pre-line leading-relaxed">
                  {isQuote ? templateSettings.quotation_terms : templateSettings.invoice_terms}
                </p>
              </div>
            </div>

            {/* Calculations Column */}
            <div className="w-full sm:w-5/12 bg-slate-50 p-5 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Items Subtotal:</span>
                <span className="font-medium text-slate-900">{formatCurrency(subtotal)}</span>
              </div>
              {deliveryFee > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Delivery Fee:</span>
                  <span className="font-medium text-slate-900">{formatCurrency(deliveryFee)}</span>
                </div>
              )}
              {setupFee > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Setup & Installation:</span>
                  <span className="font-medium text-slate-900">{formatCurrency(setupFee)}</span>
                </div>
              )}
              {otherCharges > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Transport / Other:</span>
                  <span className="font-medium text-slate-900">{formatCurrency(otherCharges)}</span>
                </div>
              )}
              {discount > 0 && (
                <div className="flex justify-between text-rose-600 font-medium">
                  <span>Special Discount:</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="pt-3 border-t border-slate-300 flex justify-between items-baseline">
                <span className="text-sm font-bold text-slate-900">Total Net Amount:</span>
                <span
                  className="text-lg font-black"
                  style={{ color: templateSettings.primary_color || '#e11d48' }}
                >
                  {formatCurrency(total)}
                </span>
              </div>

              {isQuote ? (
                <>
                  <div className="pt-2 border-t border-dashed border-slate-200 flex justify-between text-amber-800 font-semibold">
                    <span>50% Advance Required:</span>
                    <span>{formatCurrency(depositReq)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Balance On Setup:</span>
                    <span>{formatCurrency(balance)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="pt-2 border-t border-dashed border-slate-200 flex justify-between text-emerald-700 font-semibold">
                    <span>Amount Paid:</span>
                    <span>{formatCurrency(paid)}</span>
                  </div>
                  <div className="flex justify-between text-rose-700 font-bold">
                    <span>Balance Due:</span>
                    <span>{formatCurrency(balance)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-12 pt-6 border-t border-slate-200 text-center text-xs text-slate-500">
            <p className="font-medium text-slate-700">
              {isQuote ? templateSettings.quotation_footer : templateSettings.invoice_footer}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              Generated by Kids Jump 4 Joy Cloud ERP System • Date: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
