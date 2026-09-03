import React, { useState } from 'react';
import {
  FileText,
  Search,
  Filter,
  Send,
  Printer,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  ChevronRight,
  CreditCard,
  Eye,
} from 'lucide-react';
import type { Quotation, QuotationStatus } from '../types.ts';
import { formatCurrency, generateWhatsAppUrl, updateQuotationStatus } from '../lib/api.ts';

interface QuotationsListProps {
  quotations: Quotation[];
  onOpenBuilder: () => void;
  onPreview: (quote: Quotation) => void;
  onConfirmBooking: (quote: Quotation) => void;
  onRefresh: () => void;
}

export const QuotationsList: React.FC<QuotationsListProps> = ({
  quotations,
  onOpenBuilder,
  onPreview,
  onConfirmBooking,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filtered = quotations.filter((q) => {
    const matchesSearch =
      q.quotation_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.event_location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.customer_phone.includes(searchTerm);

    const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: QuotationStatus) => {
    switch (status) {
      case 'Draft':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'Sent':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Accepted':
        return 'bg-teal-100 text-teal-800 border-teal-300';
      case 'Awaiting Payment':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Paid':
      case 'Converted to Booking':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Rejected':
      case 'Expired':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const handleStatusChange = async (quoteId: string, newStatus: string) => {
    try {
      await updateQuotationStatus(quoteId, newStatus);
      onRefresh();
    } catch (err) {
      console.error(err);
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
          onClick={onOpenBuilder}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-md transition"
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
            type="text"
            placeholder="Search by quote #, customer name, phone, venue..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 outline-hidden"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 outline-hidden"
          >
            <option value="ALL">All Quotation Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Sent">Sent</option>
            <option value="Awaiting Payment">Awaiting Payment</option>
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
                <th className="py-3 px-4">Quote No</th>
                <th className="py-3 px-4">Customer & WhatsApp</th>
                <th className="py-3 px-4">Event Date & Location</th>
                <th className="py-3 px-4">Items Booked</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
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
                  const waMsg = `Hello ${quote.customer_name}! 🎈 Kids Jump 4 Joy has prepared your quotation (${quote.quotation_number}) for event date ${quote.event_date}. Total: ${formatCurrency(quote.total_amount)} (50% deposit: ${formatCurrency(quote.deposit_required)}). Please reply to confirm!`;
                  const waUrl = generateWhatsAppUrl(quote.customer_whatsapp || quote.customer_phone, waMsg);

                  return (
                    <tr key={quote.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-900 text-xs">
                          {quote.quotation_number}
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          {quote.created_at.split('T')[0]}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{quote.customer_name}</span>
                        <span className="text-[11px] text-slate-500">{quote.customer_phone}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 block">{quote.event_date}</span>
                        <span className="text-[11px] text-slate-500 line-clamp-1">
                          {quote.event_location}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          {quote.items.map((it, idx) => (
                            <span key={idx} className="block text-[11px] text-slate-700">
                              • {it.quantity}x {it.product_name_snapshot}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span className="font-black text-slate-900 block">
                          {formatCurrency(quote.total_amount)}
                        </span>
                        <span className="text-[10px] text-amber-700 font-medium">
                          Dep: {formatCurrency(quote.deposit_required)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadge(
                            quote.status
                          )}`}
                        >
                          {quote.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center space-x-1.5">
                          {/* View Preview Button */}
                          <button
                            onClick={() => onPreview(quote)}
                            title="Preview / Print Document"
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                          >
                            <Eye className="w-4 h-4" />
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

                          {/* Confirm Booking Button if not already converted */}
                          {quote.status !== 'Converted to Booking' ? (
                            <button
                              onClick={() => onConfirmBooking(quote)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold transition"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Confirm Booking</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Confirmed
                            </span>
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
