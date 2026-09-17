import React, { useRef, useState } from 'react';
import { X, Printer, Send, Mail, Download, CheckCircle, Clock, Loader2, Check } from 'lucide-react';
import type { Quotation, Invoice, CompanyTemplateSettings } from '../types.ts';
import { formatCurrency, generateWhatsAppUrl } from '../lib/api.ts';
import { downloadQuotationPdf, downloadInvoicePdf, downloadElementAsPdf } from '../lib/pdfGenerator.ts';
import { generateQuotationName } from '../lib/pricing.ts';

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
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

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

  const eventDurationDisplay = isQuote
    ? quote?.event_duration_formatted || `${(quote?.included_hours || 3) + (quote?.additional_hours || 0)} Hours`
    : '3 Hours';

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      setIsDownloadingPdf(true);
      const filename = `${docNumber || (isQuote ? 'Quotation' : 'Invoice')}.pdf`;

      if (isQuote && quote) {
        await downloadQuotationPdf(quote, templateSettings, filename);
      } else if (!isQuote && inv) {
        await downloadInvoicePdf(inv, templateSettings, filename);
      } else if (printRef.current) {
        await downloadElementAsPdf(printRef.current, filename);
      }

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to generate PDF download, falling back to direct server download:', err);
      const targetId = isQuote ? (quote?.id || quote?.quotation_number) : (inv?.id || inv?.invoice_number);
      if (targetId) {
        window.location.assign(`/api/pdf/${isQuote ? 'quotation' : 'invoice'}/${encodeURIComponent(targetId)}`);
      } else {
        window.print();
      }
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const shareText = isQuote
    ? `Hello ${customerName}! 🎈 Kids Jump 4 Joy has prepared your official event quotation (${docNumber}) for ${eventDate}. Total: ${formatCurrency(total)} (Deposit required: ${formatCurrency(depositReq)}). Please review the details. Thank you!`
    : `Hello ${customerName}! 🎈 Kids Jump 4 Joy official invoice (${docNumber}) for your event on ${eventDate}. Total: ${formatCurrency(total)}, Amount Paid: ${formatCurrency(paid)}, Balance Due: ${formatCurrency(balance)}. Thank you for choosing us!`;

  const waUrl = customerPhone ? generateWhatsAppUrl(customerPhone, shareText) : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:fixed print:inset-0">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-8 print:border-none print:shadow-none print:my-0 print:w-full print:max-w-none">
        {/* Modal Top Control Bar (Hidden on Print) */}
        <div className="flex flex-wrap items-center justify-between px-6 py-4 bg-slate-900 text-white print:hidden gap-3">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 uppercase tracking-wider">
              {isQuote ? 'Quotation Preview' : 'Official Invoice Preview'}
            </span>
            <span className="text-sm text-slate-300 font-mono font-medium">{docNumber}</span>
          </div>
          <div className="flex items-center flex-wrap gap-2">
            {waUrl && (
              <a
                href={waUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
              >
                <Send className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>
            )}

            {/* Requirement 8: Clear Download Quotation button */}
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className={`inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition shadow-sm disabled:opacity-50 ${
                downloadSuccess
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              }`}
            >
              {isDownloadingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Downloading PDF...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Downloaded to Computer!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>{isQuote ? 'Download Quotation' : 'Download Invoice'}</span>
                </>
              )}
            </button>

            {/* Requirement 8: Clear Print Quotation button */}
            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isQuote ? 'Print Quotation' : 'Print Invoice'}</span>
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
                {isQuote && (
                  <p>
                    <span className="text-slate-400">Quotation Name:</span>{' '}
                    <span className="font-semibold text-slate-900">
                      {quote?.quote_name || generateQuotationName(eventDate, customerName)}
                    </span>
                  </p>
                )}
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
              <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2">Customer Details</p>
              <h3 className="text-base font-bold text-slate-900">{customerName}</h3>
              <p className="text-xs text-slate-600 mt-1">Phone: <span className="text-slate-800 font-medium">{customerPhone}</span></p>
              {customerEmail && <p className="text-xs text-slate-600">Email: <span className="text-slate-800 font-medium">{customerEmail}</span></p>}
              {customerAddress && <p className="text-xs text-slate-600 mt-0.5">Address: <span className="text-slate-800 font-medium">{customerAddress}</span></p>}
            </div>
            <div>
              <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2">Event Details & Duration</p>
              <p className="text-xs text-slate-700">
                <span className="font-semibold text-slate-900">Event Date:</span> {eventDate}
              </p>
              {isQuote && quote && (
                <>
                  <p className="text-xs text-slate-700 mt-0.5">
                    <span className="font-semibold text-slate-900">Event Start Time:</span> {quote.event_start_time || '14:00'}
                  </p>
                  <p className="text-xs text-slate-700 mt-0.5">
                    <span className="font-semibold text-slate-900">Event End Time:</span> {quote.event_end_time || '17:00'}
                  </p>
                  <p className="text-xs text-slate-700 mt-0.5">
                    <span className="font-semibold text-slate-900">Total Event Duration:</span>{' '}
                    <span className="font-bold text-slate-900">{eventDurationDisplay}</span>{' '}
                    {(quote.additional_hours || 0) > 0 ? (
                      <span className="text-amber-800 text-[11px] font-semibold">
                        ({quote.included_hours || 3} hrs base included + {quote.additional_hours} additional {quote.additional_hours === 1 ? 'hour' : 'hours'})
                      </span>
                    ) : (
                      <span className="text-emerald-700 text-[11px] font-semibold">
                        (Up to 3 hours included)
                      </span>
                    )}
                  </p>
                </>
              )}
              <p className="text-xs text-slate-700 mt-0.5">
                <span className="font-semibold text-slate-900">Venue Location:</span> {eventLocation}
              </p>
              {isQuote && quote?.event_type && (
                <p className="text-xs text-slate-700 mt-0.5">
                  <span className="font-semibold text-slate-900">Event Type:</span> {quote.event_type}
                </p>
              )}
            </div>
          </div>

          {/* Pricing Policy Note (Requirement 8) */}
          <div className="mb-6 px-4 py-3 bg-amber-50/80 rounded-xl border border-amber-200 text-xs text-amber-950 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-amber-800">⏱️ Pricing Note:</span>
              <span className="font-medium">
                Equipment prices include up to 3 hours of usage. Additional hourly charges apply for usage beyond 3 hours.
              </span>
            </div>
            {isQuote && (
              <span className="font-bold text-slate-900 bg-white px-2.5 py-1 rounded-md border border-amber-200 text-[11px]">
                Event Duration: {eventDurationDisplay}
              </span>
            )}
          </div>

          {/* Line Items Table (Requirement 8 & 9) */}
          <div className="overflow-x-auto mb-8 border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-800 bg-slate-50 text-slate-800">
                  <th className="py-3 px-3 font-bold">#</th>
                  <th className="py-3 px-3 font-bold">Selected Equipment & Duration Details</th>
                  <th className="py-3 px-3 font-bold text-center">Quantity</th>
                  <th className="py-3 px-3 font-bold text-right">Base Price (3h)</th>
                  <th className="py-3 px-3 font-bold text-right">Additional Charge</th>
                  <th className="py-3 px-3 font-bold text-right">Discount</th>
                  <th className="py-3 px-3 font-bold text-right">Item Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((item, idx) => {
                  const addHours = item.additional_hours || 0;
                  const addRate = item.additional_hourly_rate || 0;
                  const addTotal = addRate * addHours * item.quantity;
                  const baseRate = item.base_price || item.unit_price;

                  return (
                    <tr key={item.id || idx} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-3 text-slate-400 font-mono align-top">{idx + 1}</td>
                      <td className="py-3.5 px-3 align-top">
                        <p className="font-bold text-slate-900 text-sm">{item.product_name_snapshot}</p>
                        {item.category && <p className="text-[11px] text-slate-500 mb-1.5">{item.category}</p>}
                        
                        {/* Requirement 9 breakdown card */}
                        <div className="p-2 bg-slate-50 rounded-md border border-slate-200/80 text-[11px] space-y-0.5 text-slate-600">
                          <div>Quantity: <span className="font-semibold text-slate-800">{item.quantity}</span></div>
                          <div>Included Duration: <span className="font-semibold text-slate-800">3 Hours</span></div>
                          <div>Event Duration: <span className="font-semibold text-slate-800">{eventDurationDisplay}</span></div>
                          <div>
                            Additional Hours:{' '}
                            <span className={`font-semibold ${addHours > 0 ? 'text-amber-700' : 'text-slate-800'}`}>
                              {addHours}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-center align-top">
                        <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-900 rounded font-bold font-mono text-xs">
                          {item.quantity}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-right align-top font-mono">
                        <div className="font-bold text-slate-900">{formatCurrency(baseRate)}</div>
                        <div className="text-[10px] text-slate-400">up to 3 hours</div>
                      </td>

                      <td className="py-3.5 px-3 text-right align-top font-mono">
                        {addHours > 0 ? (
                          <>
                            <div className="font-bold text-amber-700">+{formatCurrency(addTotal)}</div>
                            <div className="text-[10px] text-amber-800 font-sans">
                              {formatCurrency(addRate)} × {addHours} hr{addHours > 1 ? 's' : ''}
                            </div>
                          </>
                        ) : (
                          <div className="text-[11px] text-emerald-700 font-sans font-medium">
                            Rs. 0 (included)
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-right align-top text-rose-600 font-mono">
                        {item.discount > 0 ? `-${formatCurrency(item.discount)}` : '—'}
                      </td>

                      <td className="py-3.5 px-3 text-right align-top font-bold text-slate-900 font-mono text-sm">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  );
                })}
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
                  <span>Setup & Labor Fee:</span>
                  <span className="font-medium text-slate-900">{formatCurrency(setupFee)}</span>
                </div>
              )}
              {otherCharges > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Transport / Distance:</span>
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
                <span className="text-sm font-bold text-slate-900">Final Total:</span>
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
                    <span>50% Advance Deposit Required:</span>
                    <span>{formatCurrency(depositReq)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Balance On Event Setup:</span>
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
