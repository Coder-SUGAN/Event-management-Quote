import React, { useState } from 'react';
import {
  Calendar,
  Search,
  Filter,
  CreditCard,
  FileCheck,
  Send,
  AlertTriangle,
  XCircle,
  Eye,
  CheckCircle,
  MapPin,
  Clock,
} from 'lucide-react';
import type { Booking, BookingStatus } from '../types.ts';
import { formatCurrency, generateWhatsAppUrl, cancelBooking } from '../lib/api.ts';

interface BookingsListProps {
  bookings: Booking[];
  onRecordPayment: (booking: Booking) => void;
  onViewInvoice: (invoiceNumber: string) => void;
  onRefresh: () => void;
}

export const BookingsList: React.FC<BookingsListProps> = ({
  bookings,
  onRecordPayment,
  onViewInvoice,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [loadingCancel, setLoadingCancel] = useState<boolean>(false);

  const filtered = bookings.filter((b) => {
    const matchesSearch =
      b.booking_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.event_location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.customer_phone.includes(searchTerm);

    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCancelSubmit = async () => {
    if (!cancellingBooking) return;
    try {
      setLoadingCancel(true);
      await cancelBooking(cancellingBooking.id, cancelReason);
      setCancellingBooking(null);
      setCancelReason('');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel booking');
    } finally {
      setLoadingCancel(false);
    }
  };

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'Confirmed':
      case 'Upcoming':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Completed':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      case 'Cancelled':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Confirmed Bookings</h1>
          <p className="text-xs text-slate-500 mt-1">
            Active customer events with officially reserved equipment and synchronized schedules.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by booking #, customer, phone, location..."
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
            <option value="ALL">All Booking Statuses</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Booking & Invoice</th>
                <th className="py-3 px-4">Customer & Contact</th>
                <th className="py-3 px-4">Event Schedule & Venue</th>
                <th className="py-3 px-4">Equipment Reserved</th>
                <th className="py-3 px-4 text-right">Financials</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    No bookings found matching filters.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => {
                  const reminderMsg = `Hello ${b.customer_name}! 🎈 Kids Jump 4 Joy confirmed booking reminder (${b.booking_number}) for event on ${b.event_date} at ${b.event_start_time}. Venue: ${b.event_location}. Remaining balance: ${formatCurrency(b.balance)}. We look forward to creating joyful memories!`;
                  const waUrl = generateWhatsAppUrl(b.customer_whatsapp || b.customer_phone, reminderMsg);

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-900 block text-xs">
                          {b.booking_number}
                        </span>
                        {b.invoice_number && (
                          <button
                            onClick={() => onViewInvoice(b.invoice_number!)}
                            className="font-mono text-[11px] text-rose-600 hover:underline block"
                          >
                            {b.invoice_number}
                          </button>
                        )}
                        <span className="text-[10px] text-slate-400">Ref: {b.quotation_number}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{b.customer_name}</span>
                        <span className="text-[11px] text-slate-500">{b.customer_phone}</span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1.5 text-slate-900 font-semibold">
                          <Calendar className="w-3.5 h-3.5 text-rose-500" />
                          <span>{b.event_date}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-[11px] text-slate-500 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>
                            {b.event_start_time} - {b.event_end_time}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">
                          📍 {b.event_location}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          {b.items.map((it, idx) => (
                            <span
                              key={idx}
                              className={`block text-[11px] font-medium ${
                                b.status === 'Cancelled' ? 'line-through text-slate-400' : 'text-slate-800'
                              }`}
                            >
                              • {it.quantity}x {it.product_name_snapshot}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span className="font-bold text-slate-900 block">
                          {formatCurrency(b.total_amount)}
                        </span>
                        <span className="text-[11px] text-emerald-600 block">
                          Paid: {formatCurrency(b.amount_paid)}
                        </span>
                        {b.balance > 0 && (
                          <span className="text-[11px] text-rose-600 font-semibold block">
                            Bal: {formatCurrency(b.balance)}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadge(
                            b.status
                          )}`}
                        >
                          {b.status}
                        </span>
                        <span
                          className={`block text-[10px] font-semibold mt-1 ${
                            b.payment_status === 'Paid'
                              ? 'text-emerald-600'
                              : b.payment_status === 'Partially Paid'
                              ? 'text-amber-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {b.payment_status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center space-x-1">
                          {/* WhatsApp Reminder */}
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noreferrer"
                            title="Send WhatsApp update"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                          >
                            <Send className="w-4 h-4" />
                          </a>

                          {/* Record Payment */}
                          {b.status !== 'Cancelled' && b.balance > 0 && (
                            <button
                              onClick={() => onRecordPayment(b)}
                              title="Record Additional Payment"
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            >
                              <CreditCard className="w-4 h-4" />
                            </button>
                          )}

                          {/* View Invoice */}
                          {b.invoice_number && (
                            <button
                              onClick={() => onViewInvoice(b.invoice_number!)}
                              title="View Invoice"
                              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                            >
                              <FileCheck className="w-4 h-4" />
                            </button>
                          )}

                          {/* Cancel Booking Modal Trigger */}
                          {b.status !== 'Cancelled' && (
                            <button
                              onClick={() => setCancellingBooking(b)}
                              title="Cancel Booking & Release Equipment"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            >
                              <XCircle className="w-4 h-4" />
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

      {/* Cancellation Modal (Requirement #22) */}
      {cancellingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="p-2.5 bg-rose-50 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Cancel Booking</h3>
                <p className="text-xs text-slate-500 font-mono">{cancellingBooking.booking_number}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Cancelling this booking will immediately release all booked equipment back to inventory
              for <span className="font-semibold">{cancellingBooking.event_date}</span> and update the
              Daily Schedule.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Cancellation (Audit Trail) *
              </label>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Customer postponed due to rainy weather, deposit refunded"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setCancellingBooking(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Keep Booking
              </button>
              <button
                type="button"
                disabled={loadingCancel || !cancelReason.trim()}
                onClick={handleCancelSubmit}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition disabled:opacity-50"
              >
                {loadingCancel ? 'Releasing Equipment...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
