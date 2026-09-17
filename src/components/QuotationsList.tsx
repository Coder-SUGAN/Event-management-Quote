import React, { useState } from 'react';
import {
  Search,
  Filter,
  Send,
  Download,
  CheckCircle2,
  Plus,
  CreditCard,
  Eye,
  FileCheck2,
  Receipt,
  CalendarCheck,
  Loader2,
} from 'lucide-react';
import type { Quotation, QuotationStatus, Booking, Invoice, Payment } from '../types.ts';
import { formatCurrency, generateWhatsAppUrl } from '../lib/api.ts';
import { generateQuotationName } from '../lib/pricing.ts';
import { downloadQuotationPdf } from '../lib/pdfGenerator.ts';

interface QuotationsListProps {
  quotations: Quotation[];
  bookings?: Booking[];
  invoices?: Invoice[];
  payments?: Payment[];
  onOpenBuilder: () => void;
  onPreview: (quote: Quotation) => void;
  onConfirmBooking: (quote: Quotation) => void;
  onViewBooking?: (bookingId?: string) => void;
  onViewInvoice?: (invoice: Invoice) => void;
  onRefresh: () => void;
}

export const QuotationsList: React.FC<QuotationsListProps> = ({
  quotations,
  bookings = [],
  invoices = [],
  payments = [],
  onOpenBuilder,
  onPreview,
  onConfirmBooking,
  onViewBooking,
  onViewInvoice,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [downloadingQuoteId, setDownloadingQuoteId] = useState<string | null>(null);

  const handleDirectDownload = async (e: React.MouseEvent, quote: Quotation) => {
    e.stopPropagation();
    try {
      setDownloadingQuoteId(quote.id);
      await downloadQuotationPdf(quote);
    } catch (err) {
      console.error('Failed to download quotation PDF:', err);
    } finally {
      setDownloadingQuoteId(null);
    }
  };

  const filtered = quotations.filter((q) => {
    const term = searchTerm.toLowerCase().trim();
    const quoteNum = (q.quote_number || q.quotation_number || '').toLowerCase();
    const quoteName = (q.quote_name || generateQuotationName(q.event_date, q.customer_name)).toLowerCase();
    const custName = (q.customer_name || '').toLowerCase();
    const custPhone = (q.customer_phone || '').toLowerCase();
    const location = (q.event_location || '').toLowerCase();

    const matchesSearch =
      !term ||
      quoteNum.includes(term) ||
      quoteName.includes(term) ||
      custName.includes(term) ||
      custPhone.includes(term) ||
      location.includes(term);

    const isConfirmed =
      q.status === 'Confirmed' ||
      q.status === 'Converted to Booking' ||
      bookings.some((b) => b.quotation_id === q.id || b.id === q.converted_booking_id);

    if (statusFilter === 'ALL') return matchesSearch;
    if (statusFilter === 'Confirmed') return matchesSearch && isConfirmed;
    return matchesSearch && q.status === statusFilter;
  });

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'Fully Paid':
      case 'Paid':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'Deposit Paid':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'Partially Paid':
        return 'bg-orange-50 text-orange-800 border-orange-300';
      case 'Unpaid':
      default:
        return 'bg-rose-50 text-rose-800 border-rose-300';
    }
  };

  const getPaymentDot = (status: string) => {
    switch (status) {
      case 'Fully Paid':
      case 'Paid':
        return '🟢';
      case 'Deposit Paid':
        return '🟡';
      case 'Partially Paid':
        return '🟠';
      case 'Unpaid':
      default:
        return '🔴';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Event Quotations</h1>
          <p className="text-xs text-slate-500 mt-1">
            Create, manage, and dispatch official quotations directly to WhatsApp or email.
          </p>
        </div>
        <button
          id="new_quotation_top_btn"
          onClick={onOpenBuilder}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Quotation</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="search_quotations_input"
            type="text"
            placeholder="Search by quotation name, quote #, customer name, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 outline-hidden"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            id="filter_quotation_status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 outline-hidden"
          >
            <option value="ALL">All Quotation Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Sent">Sent</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Pending Payment">Pending Payment</option>
            <option value="Converted to Booking">Converted to Booking</option>
            <option value="Expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Quotation Name & #</th>
                <th className="py-3 px-4">Customer & Phone</th>
                <th className="py-3 px-4">Event Date & Location</th>
                <th className="py-3 px-4">Items Booked</th>
                <th className="py-3 px-4 text-right">Amounts & Balance</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    No quotations found. Click &quot;New Quotation&quot; to build one.
                  </td>
                </tr>
              ) : (
                filtered.map((quote) => {
                  const matchedBooking = bookings.find(
                    (b) => b.quotation_id === quote.id || b.id === quote.converted_booking_id
                  );
                  const matchedInvoice = invoices.find(
                    (i) =>
                      (matchedBooking && i.booking_id === matchedBooking.id) ||
                      i.quotation_id === quote.id
                  );

                  const quotePayments = payments.filter(
                    (p) =>
                      p.quotation_id === quote.id ||
                      (matchedBooking && p.booking_id === matchedBooking.id)
                  );

                  const totalPaid =
                    quotePayments.length > 0
                      ? quotePayments.reduce((acc, p) => acc + p.amount, 0)
                      : quote.amount_paid ||
                        quote.total_paid ||
                        matchedBooking?.amount_paid ||
                        0;

                  const remainingBalance = Math.max(0, quote.total_amount - totalPaid);

                  const isConfirmed =
                    quote.status === 'Confirmed' ||
                    quote.status === 'Converted to Booking' ||
                    !!matchedBooking;

                  const requiredDeposit =
                    quote.deposit_required || Math.round(quote.total_amount * 0.5);

                  let paymentStatus =
                    quote.payment_status || matchedBooking?.payment_status;
                  if (!paymentStatus) {
                    if (totalPaid >= quote.total_amount && quote.total_amount > 0) {
                      paymentStatus = 'Fully Paid';
                    } else if (totalPaid >= requiredDeposit && totalPaid > 0) {
                      paymentStatus = 'Deposit Paid';
                    } else if (totalPaid > 0) {
                      paymentStatus = 'Partially Paid';
                    } else {
                      paymentStatus = 'Unpaid';
                    }
                  }

                  const waMsg = `Hello ${quote.customer_name}! 🎈 Kids Jump 4 Joy quotation (${quote.quotation_number}) for event date ${quote.event_date}. Total: ${formatCurrency(quote.total_amount)}${totalPaid > 0 ? ` (Paid: ${formatCurrency(totalPaid)}, Balance: ${formatCurrency(remainingBalance)})` : ` (50% deposit: ${formatCurrency(requiredDeposit)})`}.`;
                  const waUrl = generateWhatsAppUrl(
                    quote.customer_whatsapp || quote.customer_phone,
                    waMsg
                  );

                  return (
                    <tr key={quote.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 text-xs block">
                          {quote.quote_name || generateQuotationName(quote.event_date, quote.customer_name)}
                        </span>
                        <div className="flex items-center space-x-1.5 mt-1">
                          <span className="font-mono text-[11px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {quote.quote_number || quote.quotation_number}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {quote.created_at.split('T')[0]}
                          </span>
                        </div>
                        {matchedBooking && (
                          <span className="inline-block mt-1 font-mono text-[9px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                            {matchedBooking.booking_number}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">
                          {quote.customer_name}
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {quote.customer_phone}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 block">
                          {quote.event_date}
                        </span>
                        <div className="flex items-center space-x-1 mt-0.5">
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            {quote.event_duration_formatted ||
                              `${quote.event_start_time}–${quote.event_end_time}`}
                          </span>
                          {(quote.additional_hours || 0) > 0 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                              +{quote.additional_hours}h extra
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {quote.event_location}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          {(quote.items || []).map((it, idx) => (
                            <span key={idx} className="block text-[11px] text-slate-700">
                              • {it.quantity}x {it.product_name_snapshot}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span className="font-black text-slate-900 block text-xs">
                          {formatCurrency(quote.total_amount)}
                        </span>
                        {totalPaid > 0 ? (
                          <div className="mt-0.5 space-y-0.5">
                            <span className="text-[11px] text-emerald-700 font-semibold block">
                              Paid: {formatCurrency(totalPaid)}
                            </span>
                            <span className="text-[11px] text-rose-700 font-semibold block">
                              Balance: {formatCurrency(remainingBalance)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-amber-700 font-medium block mt-0.5">
                            Dep Req: {formatCurrency(requiredDeposit)}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex flex-col items-center gap-1">
                          {isConfirmed ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <span className="mr-1">🟢</span> Confirmed
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                quote.status === 'Sent'
                                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                                  : quote.status === 'Draft'
                                  ? 'bg-slate-100 text-slate-700 border-slate-300'
                                  : 'bg-amber-100 text-amber-800 border-amber-300'
                              }`}
                            >
                              {quote.status}
                            </span>
                          )}

                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getPaymentBadge(
                              paymentStatus
                            )}`}
                          >
                            <span className="mr-1 text-[9px]">
                              {getPaymentDot(paymentStatus)}
                            </span>
                            {paymentStatus}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center space-x-1.5">
                          {/* View Preview Button */}
                          <button
                            onClick={() => onPreview(quote)}
                            title="Preview Quotation"
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Download PDF Button */}
                          <button
                            onClick={(e) => handleDirectDownload(e, quote)}
                            title="Download Quotation PDF to Computer"
                            disabled={downloadingQuoteId === quote.id}
                            className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition disabled:opacity-50"
                          >
                            {downloadingQuoteId === quote.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </button>

                          {/* WhatsApp Button */}
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noreferrer"
                            title="Send via WhatsApp"
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                          >
                            <Send className="w-4 h-4" />
                          </a>

                          {/* Invoice preview if booking exists */}
                          {matchedInvoice && onViewInvoice && (
                            <button
                              onClick={() => onViewInvoice(matchedInvoice)}
                              title={`View Invoice ${matchedInvoice.invoice_number}`}
                              className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                            >
                              <Receipt className="w-4 h-4" />
                            </button>
                          )}

                          {/* Booking confirmation or view booking button */}
                          {isConfirmed ? (
                            <button
                              id={`view_booking_${quote.id}`}
                              onClick={() =>
                                onViewBooking?.(matchedBooking?.id || quote.converted_booking_id)
                              }
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold transition"
                            >
                              <CalendarCheck className="w-3.5 h-3.5" />
                              <span>View Booking</span>
                            </button>
                          ) : (
                            <button
                              id={`confirm_booking_btn_${quote.id}`}
                              onClick={() => onConfirmBooking(quote)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold transition shadow-2xs"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Confirm Booking</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
