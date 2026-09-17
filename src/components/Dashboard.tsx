import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  Package,
  TrendingUp,
  ArrowRight,
  Plus,
  Send,
  Download,
  CalendarCheck,
  CreditCard,
  Users,
  Layers,
  Wrench,
  AlertTriangle,
  FileSpreadsheet,
  MapPin,
  Eye,
  CheckSquare,
} from 'lucide-react';
import type { DashboardStats, Booking, Quotation, DailyScheduleEntry, Payment, Product } from '../types.ts';
import { formatCurrency, generateWhatsAppUrl } from '../lib/api.ts';
import { generateQuotationName } from '../lib/pricing.ts';

interface DashboardProps {
  stats: DashboardStats;
  bookings: Booking[];
  quotations: Quotation[];
  dailySchedule: DailyScheduleEntry[];
  payments?: Payment[];
  products?: Product[];
  onOpenQuotationBuilder: () => void;
  onNavigateTab: (tab: string) => void;
  onPreviewQuotation: (quote: Quotation) => void;
  onRecordPayment?: (booking: Booking) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  stats,
  bookings,
  quotations,
  dailySchedule,
  payments = [],
  products = [],
  onOpenQuotationBuilder,
  onNavigateTab,
  onPreviewQuotation,
  onRecordPayment,
}) => {
  // Today's date string YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  // Today's events (or sample operating date 2026-09-15 if matches sample data)
  const sampleOrToday = bookings.some((b) => b.event_date === todayStr) ? todayStr : '2026-09-15';
  const todaysEvents = bookings.filter(
    (b) => (b.event_date === todayStr || b.event_date === '2026-09-15') && b.status !== 'Cancelled'
  );

  // Upcoming bookings (next events)
  const upcomingBookings = bookings
    .filter((b) => b.status === 'Confirmed' || b.status === 'In Progress')
    .slice(0, 5);

  // Pending quotations
  const pendingQuotes = quotations
    .filter((q) => q.status === 'Draft' || q.status === 'Sent' || q.status === 'Awaiting Payment')
    .slice(0, 5);

  // Bookings with outstanding balance
  const outstandingBookings = bookings
    .filter((b) => b.status !== 'Cancelled' && b.balance > 0)
    .slice(0, 5);

  // Calculate today's revenue summary
  const todayPayments = payments.filter((p) => p.payment_date === todayStr || p.payment_date === '2026-09-15');
  const todayRevenue = todayPayments.reduce((sum, p) => sum + p.amount, 0);

  // Equipment currently booked (aggregate from upcoming bookings)
  const bookedEquipmentCount = upcomingBookings.reduce((sum, b) => {
    return sum + b.items.reduce((iSum, item) => iSum + item.quantity, 0);
  }, 0);

  // Equipment requiring attention (maintenance or low availability)
  const maintenanceProducts = products.filter((p) => p.status === 'maintenance');

  const statCards = [
    {
      title: "Today's Events",
      value: todaysEvents.length > 0 ? todaysEvents.length : stats.todays_events_count,
      sub: `${sampleOrToday === '2026-09-15' ? '15 Sep sample' : 'Today'} active`,
      icon: Calendar,
      color: 'bg-rose-500/10 text-rose-600',
      actionTab: 'schedule',
    },
    {
      title: 'Confirmed Bookings',
      value: stats.confirmed_bookings_count || bookings.filter((b) => b.status === 'Confirmed').length,
      sub: 'Equipment reserved',
      icon: CheckCircle2,
      color: 'bg-emerald-500/10 text-emerald-600',
      actionTab: 'bookings',
    },
    {
      title: 'Pending Quotations',
      value: pendingQuotes.length || stats.pending_quotations_count,
      sub: 'Awaiting confirmation',
      icon: FileText,
      color: 'bg-blue-500/10 text-blue-600',
      actionTab: 'quotations',
    },
    {
      title: 'Outstanding Receivables',
      value: formatCurrency(stats.outstanding_payments_amount),
      sub: `${outstandingBookings.length} booking(s) due`,
      icon: AlertCircle,
      color: 'bg-amber-500/10 text-amber-600',
      actionTab: 'bookings',
      isCurrency: true,
    },
    {
      title: 'Monthly Revenue',
      value: formatCurrency(stats.monthly_revenue_amount),
      sub: 'Recorded collections',
      icon: TrendingUp,
      color: 'bg-emerald-600/10 text-emerald-600',
      actionTab: 'payments',
      isCurrency: true,
    },
    {
      title: 'Gear in Active Field',
      value: bookedEquipmentCount || stats.todays_equipment_count,
      sub: 'Inflatables & units dispatched',
      icon: Package,
      color: 'bg-indigo-500/10 text-indigo-600',
      actionTab: 'availability',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner & Quick Actions Hub */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-slate-900 via-slate-800 to-rose-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-semibold mb-3 border border-rose-500/30">
              <span>Kids Jump 4 Joy • Daily Operations ERP</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Operations Control Center
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl leading-relaxed">
              Real-time daily operations: active events, equipment schedules, customer quotations, invoices, and payment tracking.
            </p>
          </div>

          {/* Quick Actions Hub */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onOpenQuotationBuilder}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ New Quotation</span>
            </button>

            <button
              onClick={() => onNavigateTab('availability')}
              className="inline-flex items-center space-x-2 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl backdrop-blur-xs transition"
            >
              <Layers className="w-4 h-4" />
              <span>Check Availability</span>
            </button>

            <button
              onClick={() => onNavigateTab('schedule')}
              className="inline-flex items-center space-x-2 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl backdrop-blur-xs transition"
            >
              <Calendar className="w-4 h-4" />
              <span>Event Schedule</span>
            </button>

            <button
              onClick={() => onNavigateTab('customers')}
              className="inline-flex items-center space-x-2 px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl backdrop-blur-xs transition"
            >
              <Users className="w-4 h-4" />
              <span>Customers</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={() => onNavigateTab(card.actionTab)}
              className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md transition cursor-pointer flex flex-col justify-between"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    {card.title}
                  </span>
                  <span className="text-2xl font-black mt-1.5 block text-slate-900">
                    {card.value}
                  </span>
                </div>
                <div className={`p-2.5 rounded-xl ${card.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-xs">
                <span className="text-slate-500 text-[11px]">{card.sub}</span>
                <span className="text-rose-600 font-semibold flex items-center group">
                  Open <ArrowRight className="w-3.5 h-3.5 ml-1 transition group-hover:translate-x-0.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* TODAY'S EVENTS & DISPATCH SUMMARY */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Today's Event Operations & Dispatch Schedule
              </h2>
              <p className="text-xs text-slate-500">
                Active parties, delivery times, and on-site setup teams ({sampleOrToday})
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onNavigateTab('schedule')}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Full Schedule & Excel</span>
            </button>
          </div>
        </div>

        {todaysEvents.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Calendar className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="font-semibold text-xs text-slate-600">No events scheduled for today.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Check upcoming bookings or schedule view for upcoming dates.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {todaysEvents.map((evt) => {
              const waUrl = generateWhatsAppUrl(
                evt.customer_whatsapp || evt.customer_phone,
                `Hello ${evt.customer_name}! Kids Jump 4 Joy operations check-in for your event today (${evt.booking_number}) at ${evt.event_location}. Our crew is on schedule!`
              );

              return (
                <div
                  key={evt.id}
                  className="p-4 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-200 transition space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-xs text-slate-900">{evt.booking_number}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {evt.status}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm mt-1">{evt.customer_name}</h4>
                    </div>

                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition"
                      title="WhatsApp Customer"
                    >
                      <Send className="w-4 h-4" />
                    </a>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1">
                    <div className="flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold">{evt.event_start_time} - {evt.event_end_time}</span>
                    </div>
                    <div className="flex items-start space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                      <span className="truncate">{evt.event_location}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                    <div className="text-[11px] text-slate-500">
                      {evt.items.length} equipment unit(s)
                    </div>
                    <div className="text-right">
                      {evt.balance > 0 ? (
                        <span className="font-bold text-rose-600">
                          Collect: {formatCurrency(evt.balance)}
                        </span>
                      ) : (
                        <span className="font-semibold text-emerald-700">
                          Paid in Full
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* TWO COLUMNS: Upcoming Bookings & Pending Quotations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Confirmed Bookings */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Upcoming Confirmed Bookings</h3>
            </div>
            <button
              onClick={() => onNavigateTab('bookings')}
              className="text-xs font-semibold text-rose-600 hover:underline"
            >
              View all ({bookings.length})
            </button>
          </div>

          <div className="space-y-3">
            {upcomingBookings.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No upcoming bookings recorded.</p>
            ) : (
              upcomingBookings.map((b) => (
                <div
                  key={b.id}
                  onClick={() => onNavigateTab('bookings')}
                  className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 transition flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-slate-900">{b.booking_number}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {b.status}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 mt-1">{b.customer_name}</p>
                    <p className="text-[11px] text-slate-500">
                      📅 {b.event_date} ({b.event_start_time} - {b.event_end_time}) • 📍 {b.event_location}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-xs text-slate-900 block">
                      {formatCurrency(b.total_amount)}
                    </span>
                    {b.balance > 0 ? (
                      <span className="text-[10px] font-bold text-rose-600">
                        Bal: {formatCurrency(b.balance)}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-emerald-600">
                        Paid
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending Quotations Awaiting Action */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-rose-600" />
              <h3 className="text-sm font-bold text-slate-900">Pending Quotations</h3>
            </div>
            <button
              onClick={() => onNavigateTab('quotations')}
              className="text-xs font-semibold text-rose-600 hover:underline"
            >
              View all ({quotations.length})
            </button>
          </div>

          <div className="space-y-3">
            {pendingQuotes.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No pending quotations.</p>
            ) : (
              pendingQuotes.map((q) => (
                <div
                  key={q.id}
                  className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 transition flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs text-slate-900">
                        {q.quote_name || generateQuotationName(q.event_date, q.customer_name)}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        {q.status}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                      <span className="font-mono text-slate-600 font-medium">
                        {q.quote_number || q.quotation_number}
                      </span>
                      <span>•</span>
                      <span className="font-medium text-slate-700">{q.customer_name}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      📅 For: {q.event_date} • {q.items.length} item(s)
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-xs text-slate-900 block">
                      {formatCurrency(q.total)}
                    </span>
                    <button
                      onClick={() => onPreviewQuotation(q)}
                      className="text-[10px] text-rose-600 font-bold hover:underline"
                    >
                      View / Send Quote
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* EQUIPMENT STATUS & ATTENTION SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Outstanding Payments Due */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">Outstanding Receivables Due</h3>
            </div>
            <button
              onClick={() => onNavigateTab('payments')}
              className="text-xs font-semibold text-rose-600 hover:underline"
            >
              Payment Records
            </button>
          </div>

          <div className="space-y-3">
            {outstandingBookings.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">All booking payments are settled!</p>
            ) : (
              outstandingBookings.map((b) => (
                <div
                  key={b.id}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-slate-900 block">{b.booking_number}</span>
                    <span className="text-[11px] text-slate-600 font-medium">{b.customer_name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-rose-600 block">{formatCurrency(b.balance)}</span>
                    {onRecordPayment && (
                      <button
                        onClick={() => onRecordPayment(b)}
                        className="text-[10px] font-bold text-emerald-700 hover:underline"
                      >
                        + Record Payment
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Equipment Status & Requiring Attention */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Package className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Equipment & Fleet Status</h3>
            </div>
            <button
              onClick={() => onNavigateTab('products')}
              className="text-xs font-semibold text-rose-600 hover:underline"
            >
              Inventory Manager
            </button>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <Package className="w-4 h-4 text-indigo-600" />
                <span className="font-semibold text-indigo-900">Total Inventory Catalog</span>
              </div>
              <span className="font-bold text-indigo-900">{products.length} Equipment Types</span>
            </div>

            {maintenanceProducts.length > 0 ? (
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 space-y-2 text-xs">
                <div className="flex items-center space-x-2 text-amber-800 font-bold">
                  <Wrench className="w-4 h-4 text-amber-600" />
                  <span>{maintenanceProducts.length} Item(s) in Maintenance</span>
                </div>
                <div className="space-y-1">
                  {maintenanceProducts.map((p) => (
                    <div key={p.id} className="text-[11px] text-amber-700 flex justify-between">
                      <span>• {p.name}</span>
                      <span className="font-semibold">Under Inspection</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center space-x-2 text-xs text-emerald-800 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>All fleet units are active and operational for dispatch.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
