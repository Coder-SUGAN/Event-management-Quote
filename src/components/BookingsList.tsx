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
  CheckCircle2,
  MapPin,
  Clock,
  Plus,
  Edit3,
  Download,
  Printer,
  FileText,
  DollarSign,
  Package,
  X,
  ChevronRight,
  Phone,
  User,
  ShieldAlert,
} from 'lucide-react';
import type { Booking, BookingStatus, Invoice } from '../types.ts';
import {
  formatCurrency,
  generateWhatsAppUrl,
  cancelBooking,
  updateBooking,
  markBookingCompleted,
  generateInvoiceForBooking,
} from '../lib/api.ts';
import { triggerFileDownload } from '../lib/pdfGenerator.ts';

interface BookingsListProps {
  bookings: Booking[];
  invoices?: Invoice[];
  onRecordPayment: (booking: Booking) => void;
  onViewInvoice: (invoiceNumber: string) => void;
  onRefresh: () => void;
}

export const BookingsList: React.FC<BookingsListProps> = ({
  bookings,
  invoices = [],
  onRecordPayment,
  onViewInvoice,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Active viewing booking for details modal
  const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);

  // Edit Booking Modal
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editLocation, setEditLocation] = useState<string>('');
  const [editStartTime, setEditStartTime] = useState<string>('');
  const [editEndTime, setEditEndTime] = useState<string>('');
  const [editSpecialReqs, setEditSpecialReqs] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  // Cancel Booking Modal
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [loadingCancel, setLoadingCancel] = useState<boolean>(false);

  // Action feedback
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const filtered = bookings.filter((b) => {
    const matchesSearch =
      b.booking_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.event_location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.invoice_number && b.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      b.customer_phone.includes(searchTerm);

    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'Confirmed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Upcoming':
      case 'In Progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Completed':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Pending Payment':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Cancelled':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

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

  const handleCancelSubmit = async () => {
    if (!cancellingBooking) return;
    try {
      setLoadingCancel(true);
      await cancelBooking(cancellingBooking.id, cancelReason);
      setCancellingBooking(null);
      setCancelReason('');
      if (viewingBooking && viewingBooking.id === cancellingBooking.id) {
        setViewingBooking(null);
      }
      showFeedback(`Booking ${cancellingBooking.booking_number} has been cancelled and equipment released.`);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel booking');
    } finally {
      setLoadingCancel(false);
    }
  };

  const handleGenerateInvoice = async (booking: Booking) => {
    try {
      setActionLoadingId(booking.id);
      const invoice = await generateInvoiceForBooking(booking.id);
      showFeedback(`Official Invoice ${invoice.invoice_number} generated successfully!`);
      onRefresh();
      // Update local view if viewing
      if (viewingBooking && viewingBooking.id === booking.id) {
        setViewingBooking({ ...viewingBooking, invoice_number: invoice.invoice_number });
      }
      onViewInvoice(invoice.invoice_number);
    } catch (err: any) {
      alert(err.message || 'Failed to generate invoice');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleMarkCompleted = async (booking: Booking) => {
    if (!confirm(`Mark booking ${booking.booking_number} as Completed? This marks the event as finished.`)) {
      return;
    }
    try {
      setActionLoadingId(booking.id);
      const updated = await markBookingCompleted(booking.id);
      showFeedback(`Booking ${booking.booking_number} marked as Completed!`);
      if (viewingBooking && viewingBooking.id === booking.id) {
        setViewingBooking(updated);
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to complete booking');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenEdit = (b: Booking) => {
    setEditingBooking(b);
    setEditLocation(b.event_location);
    setEditStartTime(b.event_start_time);
    setEditEndTime(b.event_end_time);
    setEditSpecialReqs(b.special_requirements || '');
    setEditNotes(b.notes || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking) return;
    try {
      setSavingEdit(true);
      const updated = await updateBooking(editingBooking.id, {
        event_location: editLocation,
        event_start_time: editStartTime,
        event_end_time: editEndTime,
        special_requirements: editSpecialReqs,
        notes: editNotes,
      });
      showFeedback(`Booking ${editingBooking.booking_number} updated successfully.`);
      setEditingBooking(null);
      if (viewingBooking && viewingBooking.id === updated.id) {
        setViewingBooking(updated);
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update booking');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successMsg && (
        <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-lg flex items-center justify-between text-xs font-bold animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Confirmed Bookings
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage confirmed events, invoice generation, payment tracking, schedule updates, and completion.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 bg-white px-3 py-2 rounded-xl border border-slate-200">
          <span>Total Bookings:</span>
          <span className="font-bold text-slate-900">{bookings.length}</span>
          <span>•</span>
          <span>Active:</span>
          <span className="font-bold text-emerald-600">
            {bookings.filter((b) => b.status === 'Confirmed' || b.status === 'In Progress').length}
          </span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search booking #, invoice #, customer name, phone..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto w-full md:w-auto">
          <span className="text-xs font-semibold text-slate-400 shrink-0">Status:</span>
          {(['ALL', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition shrink-0 ${
                statusFilter === st
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Booking / Invoice</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Event Date & Venue</th>
                <th className="py-3.5 px-4">Equipment Reserved</th>
                <th className="py-3.5 px-4 text-right">Financials</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Calendar className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold">No bookings found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Confirmed quotations automatically convert into active bookings here.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((b) => {
                  const reminderMsg = `Hello ${b.customer_name}! 🎈 Kids Jump 4 Joy confirmed booking reminder (${b.booking_number}) for event on ${b.event_date} at ${b.event_start_time}. Venue: ${b.event_location}. Remaining balance: ${formatCurrency(b.balance)}. We look forward to creating joyful memories!`;
                  const waUrl = generateWhatsAppUrl(b.customer_whatsapp || b.customer_phone, reminderMsg);

                  return (
                    <tr
                      key={b.id}
                      className="hover:bg-slate-50/75 transition cursor-pointer"
                      onClick={() => setViewingBooking(b)}
                    >
                      {/* Booking # & Invoice # */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-slate-900 block text-xs">
                          {b.booking_number}
                        </span>
                        {b.invoice_number ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewInvoice(b.invoice_number!);
                            }}
                            className="inline-flex items-center space-x-1 font-mono text-[11px] text-rose-600 hover:text-rose-700 hover:underline font-bold mt-0.5"
                            title="View / Print Invoice"
                          >
                            <FileCheck className="w-3 h-3" />
                            <span>{b.invoice_number}</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 block mt-0.5">No invoice yet</span>
                        )}
                        <span className="text-[10px] text-slate-400 block">Ref: {b.quotation_number}</span>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{b.customer_name}</span>
                        <span className="text-[11px] text-slate-500 block">{b.customer_phone}</span>
                      </td>

                      {/* Date & Location */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-1.5 text-slate-900 font-semibold">
                          <Calendar className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span>{b.event_date}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-[11px] text-slate-500 mt-0.5">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>
                            {b.event_start_time} - {b.event_end_time}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-600 line-clamp-1 mt-0.5 max-w-[170px]">
                          📍 {b.event_location}
                        </span>
                      </td>

                      {/* Equipment */}
                      <td className="py-3.5 px-4 max-w-[200px]">
                        <div className="space-y-0.5">
                          {(b.items || []).slice(0, 3).map((it, idx) => (
                            <span
                              key={idx}
                              className={`block text-[11px] font-medium truncate ${
                                b.status === 'Cancelled' ? 'line-through text-slate-400' : 'text-slate-800'
                              }`}
                            >
                              • {it.quantity}x {it.product_name_snapshot}
                            </span>
                          ))}
                          {(b.items || []).length > 3 && (
                            <span className="text-[10px] text-slate-400">
                              +{(b.items || []).length - 3} more item(s)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Financials */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-bold text-slate-900 block">
                          {formatCurrency(b.total_amount)}
                        </span>
                        <span className="text-[11px] text-emerald-600 block">
                          Paid: {formatCurrency(b.amount_paid)}
                        </span>
                        {b.balance > 0 ? (
                          <span className="text-[11px] text-rose-600 font-bold block">
                            Bal: {formatCurrency(b.balance)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-600 font-medium block">
                            Fully Settled
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadge(
                            b.status
                          )}`}
                        >
                          {b.status}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold mt-1 border ${getPaymentBadge(
                            b.payment_status
                          )}`}
                        >
                          <span className="mr-1 text-[8px]">
                            {b.payment_status === 'Fully Paid' || b.payment_status === 'Paid'
                              ? '🟢'
                              : b.payment_status === 'Deposit Paid'
                              ? '🟡'
                              : b.payment_status === 'Partially Paid'
                              ? '🟠'
                              : '🔴'}
                          </span>
                          {b.payment_status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center space-x-1">
                          {/* View Booking Modal */}
                          <button
                            onClick={() => setViewingBooking(b)}
                            title="View Full Booking Details & Actions"
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Invoice Actions */}
                          {b.invoice_number ? (
                            <button
                              onClick={() => onViewInvoice(b.invoice_number!)}
                              title="View / Print / Download Official Invoice"
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            >
                              <FileCheck className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleGenerateInvoice(b)}
                              disabled={actionLoadingId === b.id}
                              title="Generate Official Invoice"
                              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-[10px] transition flex items-center space-x-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Invoice</span>
                            </button>
                          )}

                          {/* Record Payment */}
                          {b.status !== 'Cancelled' && b.balance > 0 && (
                            <button
                              onClick={() => onRecordPayment(b)}
                              title="Record Payment"
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-[10px] transition flex items-center space-x-1"
                            >
                              <CreditCard className="w-3 h-3" />
                              <span>Pay</span>
                            </button>
                          )}

                          {/* Complete Booking */}
                          {b.status === 'Confirmed' && (
                            <button
                              onClick={() => handleMarkCompleted(b)}
                              disabled={actionLoadingId === b.id}
                              title="Mark Booking Completed"
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}

                          {/* WhatsApp */}
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noreferrer"
                            title="Send WhatsApp Update"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                          >
                            <Send className="w-4 h-4" />
                          </a>

                          {/* Edit Booking */}
                          <button
                            onClick={() => handleOpenEdit(b)}
                            title="Edit Booking"
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
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

      {/* COMPREHENSIVE BOOKING DETAILS & ACTIONS MODAL */}
      {viewingBooking && (() => {
        const b = viewingBooking;
        const reminderMsg = `Hello ${b.customer_name}! Kids Jump 4 Joy booking ${b.booking_number} update. Total: ${formatCurrency(b.total_amount)}, Paid: ${formatCurrency(b.amount_paid)}, Balance: ${formatCurrency(b.balance)}.`;
        const waUrl = generateWhatsAppUrl(b.customer_whatsapp || b.customer_phone, reminderMsg);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
            <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="p-6 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center text-white font-bold">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-xl font-black">{b.booking_number}</h2>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getStatusBadge(b.status)}`}>
                        {b.status}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        b.payment_status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {b.payment_status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Quotation Ref: <span className="font-mono text-slate-300">{b.quotation_number}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleOpenEdit(b)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Booking</span>
                  </button>

                  <button
                    onClick={() => setViewingBooking(null)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 grow bg-slate-50/50">
                {/* 1. Official Invoice Management Block (User Requirement #1) */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start space-x-3">
                      <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shrink-0 mt-0.5">
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                          Official Tax Invoice
                        </span>
                        {b.invoice_number ? (
                          <>
                            <div className="text-base font-black text-slate-900 mt-0.5">
                              {b.invoice_number}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Ready for customer delivery, printing, or PDF download.
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="text-sm font-bold text-slate-700 mt-0.5">
                              Invoice Not Yet Generated
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Generate the official VAT / tax invoice for this confirmed booking.
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {b.invoice_number ? (
                        <>
                          <button
                            onClick={() => onViewInvoice(b.invoice_number!)}
                            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs transition"
                          >
                            <Eye className="w-4 h-4" />
                            <span>View / Print Invoice</span>
                          </button>
                          <button
                            onClick={() => triggerFileDownload(`/api/pdf/invoice/${encodeURIComponent(b.invoice_number!)}`, `${b.invoice_number}.pdf`)}
                            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
                            title="Download Invoice PDF to Computer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleGenerateInvoice(b)}
                          disabled={actionLoadingId === b.id}
                          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs transition"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Generate Official Invoice</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Customer & Event Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Customer Card */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Customer Information</span>
                    <div className="font-bold text-slate-900 text-sm">{b.customer_name}</div>
                    <div className="text-xs text-slate-600 space-y-1">
                      <div className="flex items-center space-x-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{b.customer_phone}</span>
                      </div>
                      {b.customer_email && (
                        <div className="flex items-center space-x-2">
                          <span className="text-slate-400">@</span>
                          <span>{b.customer_email}</span>
                        </div>
                      )}
                      {b.customer_address && (
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{b.customer_address}</span>
                        </div>
                      )}
                    </div>
                    <div className="pt-2">
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold rounded-lg text-xs transition"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Message on WhatsApp</span>
                      </a>
                    </div>
                  </div>

                  {/* Event Timing & Location */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Event Schedule & Location</span>
                    <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm">
                      <Calendar className="w-4 h-4 text-rose-600" />
                      <span>{b.event_date}</span>
                    </div>
                    <div className="text-xs text-slate-600 space-y-1">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Operating Hours: {b.event_start_time} to {b.event_end_time}</span>
                      </div>
                      <div className="flex items-start space-x-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>{b.event_location}</span>
                      </div>
                      {b.event_type && (
                        <div className="text-[11px] text-slate-500">
                          Event Type: <span className="font-semibold text-slate-700">{b.event_type}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. Reserved Equipment List */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Reserved Inflatables & Equipment ({(b.items || []).length})
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {(b.items || []).map((item, idx) => (
                      <div key={idx} className="p-3.5 flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-3">
                          <span className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 font-bold flex items-center justify-center text-[11px]">
                            {item.quantity}x
                          </span>
                          <div>
                            <span className="font-bold text-slate-800">{item.product_name_snapshot}</span>
                            <div className="text-[10px] text-slate-400">
                              Base (up to 3 hrs): {formatCurrency(item.unit_price || 0)}
                              {item.additional_hourly_rate ? ` • +${formatCurrency(item.additional_hourly_rate)}/hr addl.` : ''}
                            </div>
                          </div>
                        </div>
                        <div className="font-bold text-slate-900">
                          {formatCurrency(item.total)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Financial Summary */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Financial Breakdown</span>
                  <div className="text-xs text-slate-600 space-y-1.5 pt-1">
                    <div className="flex justify-between">
                      <span>Equipment Subtotal:</span>
                      <span className="font-medium text-slate-900">{formatCurrency(b.subtotal)}</span>
                    </div>
                    {b.delivery_fee > 0 && (
                      <div className="flex justify-between">
                        <span>Delivery Fee:</span>
                        <span className="font-medium text-slate-900">{formatCurrency(b.delivery_fee)}</span>
                      </div>
                    )}
                    {b.setup_fee > 0 && (
                      <div className="flex justify-between">
                        <span>Setup Fee:</span>
                        <span className="font-medium text-slate-900">{formatCurrency(b.setup_fee)}</span>
                      </div>
                    )}
                    {b.discount > 0 && (
                      <div className="flex justify-between text-rose-600">
                        <span>Discount:</span>
                        <span>-{formatCurrency(b.discount)}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-slate-900">
                      <span>Total Invoiced:</span>
                      <span>{formatCurrency(b.total_amount)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-emerald-700 font-bold">
                      <span>Amount Paid:</span>
                      <span>{formatCurrency(b.amount_paid)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-rose-600 font-black">
                      <span>Remaining Balance:</span>
                      <span>{formatCurrency(b.balance)}</span>
                    </div>
                  </div>
                </div>

                {/* Special Reqs & Notes */}
                {(b.special_requirements || b.notes) && (
                  <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 text-xs text-amber-900 space-y-1">
                    <span className="font-bold text-[11px] uppercase tracking-wider block">Special Notes</span>
                    <p>{b.special_requirements || b.notes}</p>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center space-x-2">
                  {b.status !== 'Cancelled' && (
                    <button
                      onClick={() => {
                        setCancellingBooking(b);
                        setViewingBooking(null);
                      }}
                      className="px-3 py-2 text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-xl transition"
                    >
                      Cancel Booking
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {b.status === 'Confirmed' && (
                    <button
                      onClick={() => handleMarkCompleted(b)}
                      disabled={actionLoadingId === b.id}
                      className="inline-flex items-center space-x-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Mark Completed</span>
                    </button>
                  )}

                  {b.balance > 0 && b.status !== 'Cancelled' && (
                    <button
                      onClick={() => {
                        onRecordPayment(b);
                        setViewingBooking(null);
                      }}
                      className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Record Payment</span>
                    </button>
                  )}

                  <button
                    onClick={() => setViewingBooking(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* EDIT BOOKING MODAL */}
      {editingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-black text-base">Edit Booking: {editingBooking.booking_number}</h3>
              <button
                onClick={() => setEditingBooking(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Event Venue / Location *
                </label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    End Time *
                  </label>
                  <input
                    type="time"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Special Requirements / Delivery Instructions
                </label>
                <textarea
                  rows={2}
                  value={editSpecialReqs}
                  onChange={(e) => setEditSpecialReqs(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Internal Notes
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingBooking(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANCEL BOOKING MODAL */}
      {cancellingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 bg-rose-50 border-b border-rose-100 flex items-start space-x-3">
              <div className="p-2 bg-rose-100 text-rose-700 rounded-xl shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-rose-900">
                  Cancel Booking {cancellingBooking.booking_number}?
                </h3>
                <p className="text-xs text-rose-700 mt-1">
                  This will mark the booking as cancelled and immediately release reserved equipment back to inventory.
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Cancellation
                </label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Customer rescheduled, weather cancellation, requested refund..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCancellingBooking(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Keep Booking
                </button>
                <button
                  type="button"
                  onClick={handleCancelSubmit}
                  disabled={loadingCancel}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition"
                >
                  {loadingCancel ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
