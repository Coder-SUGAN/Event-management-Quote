import React from 'react';
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
} from 'lucide-react';
import type { DashboardStats, Booking, Quotation, DailyScheduleEntry } from '../types.ts';
import { formatCurrency } from '../lib/api.ts';

interface DashboardProps {
  stats: DashboardStats;
  bookings: Booking[];
  quotations: Quotation[];
  dailySchedule: DailyScheduleEntry[];
  onOpenQuotationBuilder: () => void;
  onNavigateTab: (tab: string) => void;
  onPreviewQuotation: (quote: Quotation) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  stats,
  bookings,
  quotations,
  dailySchedule,
  onOpenQuotationBuilder,
  onNavigateTab,
  onPreviewQuotation,
}) => {
  const statCards = [
    {
      title: "Today's Events",
      value: stats.todays_events_count,
      sub: 'Active on calendar',
      icon: Calendar,
      color: 'bg-rose-500 text-rose-500',
      actionTab: 'bookings',
    },
    {
      title: 'Confirmed Bookings',
      value: stats.confirmed_bookings_count,
      sub: 'Equipment reserved',
      icon: CheckCircle2,
      color: 'bg-emerald-500 text-emerald-500',
      actionTab: 'bookings',
    },
    {
      title: 'Pending Quotations',
      value: stats.pending_quotations_count,
      sub: `${stats.unpaid_quotations_count} awaiting payment`,
      icon: FileText,
      color: 'bg-blue-500 text-blue-500',
      actionTab: 'quotations',
    },
    {
      title: "Today's Gear in Field",
      value: stats.todays_equipment_count,
      sub: 'Inflatables & items dispatched',
      icon: Package,
      color: 'bg-indigo-500 text-indigo-500',
      actionTab: 'schedule',
    },
    {
      title: 'Outstanding Balance',
      value: formatCurrency(stats.outstanding_payments_amount),
      sub: 'Receivables due on setup',
      icon: AlertCircle,
      color: 'bg-amber-500 text-amber-500',
      actionTab: 'bookings',
      isCurrency: true,
    },
    {
      title: 'This Month Revenue',
      value: formatCurrency(stats.monthly_revenue_amount),
      sub: 'Settled bank & cash deposits',
      icon: TrendingUp,
      color: 'bg-emerald-600 text-emerald-600',
      actionTab: 'payments',
      isCurrency: true,
    },
  ];

  const recentQuotes = quotations.slice(0, 4);
  const recentBookings = bookings.filter((b) => b.status !== 'Cancelled').slice(0, 4);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-slate-900 via-slate-800 to-rose-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-semibold mb-3 border border-rose-500/30">
              <span>Kids Jump 4 Joy • Admin ERP</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Event Management & Inventory System
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl leading-relaxed">
              WhatsApp inquiries → Instant date availability check → Official Quotations → Payment confirmation → Automated Daily Excel Schedule.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenQuotationBuilder}
              className="inline-flex items-center space-x-2 px-5 py-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg transition"
            >
              <Plus className="w-4 h-4" />
              <span>New Quotation</span>
            </button>

            <button
              onClick={() => onNavigateTab('availability')}
              className="inline-flex items-center space-x-2 px-4 py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl backdrop-blur-xs transition"
            >
              <Calendar className="w-4 h-4" />
              <span>Check Availability</span>
            </button>

            <a
              href="/api/schedule/export-excel"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-md transition"
            >
              <Download className="w-4 h-4" />
              <span>Daily Excel</span>
            </a>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
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
                  <span
                    className={`text-2xl font-black mt-1.5 block ${
                      card.isCurrency ? 'text-slate-900' : 'text-slate-900'
                    }`}
                  >
                    {card.value}
                  </span>
                </div>
                <div className={`p-2.5 rounded-xl bg-slate-50 border border-slate-100 ${card.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-xs">
                <span className="text-slate-500 text-[11px]">{card.sub}</span>
                <span className="text-rose-600 font-semibold flex items-center group">
                  View <ArrowRight className="w-3.5 h-3.5 ml-1 transition group-hover:translate-x-0.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two Columns: Recent Confirmed Events & Recent Quotations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Confirmed Bookings */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Upcoming Confirmed Events</h3>
            </div>
            <button
              onClick={() => onNavigateTab('bookings')}
              className="text-xs font-semibold text-rose-600 hover:underline"
            >
              View all ({bookings.length})
            </button>
          </div>

          <div className="space-y-3">
            {recentBookings.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No confirmed bookings yet.</p>
            ) : (
              recentBookings.map((b) => (
                <div
                  key={b.id}
                  className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 transition flex items-center justify-between"
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
                    <span
                      className={`text-[10px] font-semibold ${
                        b.payment_status === 'Paid' ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                    >
                      {b.payment_status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Quotations */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-rose-600" />
              <h3 className="text-sm font-bold text-slate-900">Recent Quotations</h3>
            </div>
            <button
              onClick={() => onNavigateTab('quotations')}
              className="text-xs font-semibold text-rose-600 hover:underline"
            >
              View all ({quotations.length})
            </button>
          </div>

          <div className="space-y-3">
            {recentQuotes.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No quotations generated yet.</p>
            ) : (
              recentQuotes.map((q) => (
                <div
                  key={q.id}
                  className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 transition flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-slate-900">{q.quotation_number}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          q.status === 'Converted to Booking'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {q.status}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 mt-1">{q.customer_name}</p>
                    <p className="text-[11px] text-slate-500">
                      For: {q.event_date} • {q.items.length} equipment items
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-xs text-slate-900 block">
                      {formatCurrency(q.total_amount)}
                    </span>
                    <button
                      onClick={() => onPreviewQuotation(q)}
                      className="text-[10px] text-rose-600 font-semibold hover:underline"
                    >
                      View Preview
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
