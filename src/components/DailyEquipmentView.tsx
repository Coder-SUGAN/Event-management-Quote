import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Download,
  CheckSquare,
  Square,
  Clock,
  MapPin,
  Phone,
  User,
  Package,
  Layers,
  Sparkles,
} from 'lucide-react';
import type { DailyScheduleEntry } from '../types.ts';
import { fetchDailySchedule, fetchDailyEquipmentSummary } from '../lib/api.ts';

interface DailyEquipmentViewProps {
  onSelectBooking?: (bookingNumber: string) => void;
}

export const DailyEquipmentView: React.FC<DailyEquipmentViewProps> = () => {
  // Default to sample seed date or today's date
  const [selectedDate, setSelectedDate] = useState<string>('2026-09-15');
  const [scheduleItems, setScheduleItems] = useState<DailyScheduleEntry[]>([]);
  const [equipmentSummary, setEquipmentSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [checkedList, setCheckedList] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadData(selectedDate);
  }, [selectedDate]);

  const loadData = async (date: string) => {
    try {
      setLoading(true);
      const [schedule, summaryData] = await Promise.all([
        fetchDailySchedule(date),
        fetchDailyEquipmentSummary(date),
      ]);
      setScheduleItems(schedule);
      setEquipmentSummary(summaryData.summary || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCheck = (id: string) => {
    setCheckedList((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleExportExcel = () => {
    window.open('/api/schedule/export-excel', '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Daily Equipment & Dispatch Schedule
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated daily gear requirements, logistics packing checklist, and Excel export.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            <Download className="w-4 h-4" />
            <span>Download Multi-Sheet Excel</span>
          </button>
        </div>
      </div>

      {/* Date Navigator Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <Calendar className="w-5 h-5 text-rose-600 shrink-0" />
          <div className="flex items-center space-x-2">
            <label className="text-xs font-bold text-slate-700">Select Operating Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden bg-slate-50"
            />
          </div>
        </div>

        {/* Quick Date Shortcuts */}
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-semibold text-slate-400">Quick Date:</span>
          <button
            onClick={() => setSelectedDate('2026-09-15')}
            className={`px-3 py-1 text-xs rounded-lg font-semibold transition ${
              selectedDate === '2026-09-15'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            15 Sep (Sample Events)
          </button>
          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className={`px-3 py-1 text-xs rounded-lg font-semibold transition ${
              selectedDate === new Date().toISOString().split('T')[0]
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Today
          </button>
        </div>
      </div>

      {/* Section 1: Aggregate Equipment Summary for the Day */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Package className="w-5 h-5 text-rose-600" />
            <h2 className="text-base font-bold text-slate-900">
              Total Equipment Required on {selectedDate}
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {equipmentSummary.length} equipment type(s) scheduled
          </span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading daily schedule...</div>
        ) : equipmentSummary.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
            No equipment scheduled for {selectedDate}. All items available in warehouse.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {equipmentSummary.map((item) => (
              <div
                key={item.product_id}
                className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between"
              >
                <div>
                  <span className="text-2xl font-black text-slate-900">{item.total_quantity}</span>
                  <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
                    Units Needed
                  </span>
                  <h4 className="text-xs font-bold text-slate-800 mt-1">{item.item_name}</h4>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200/60 text-[10px] text-slate-500">
                  Across {item.bookings_count} event booking(s)
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Bookings Logistics & Dispatch Checklist */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckSquare className="w-5 h-5 text-slate-700" />
            <h3 className="font-bold text-sm text-slate-900">
              Daily Vehicle Packing & Delivery Checklist ({selectedDate})
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Click checkboxes when equipment is loaded into delivery vans
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-12 text-center">Packed</th>
                <th className="py-3 px-4">Equipment Item</th>
                <th className="py-3 px-4 text-center">Quantity</th>
                <th className="py-3 px-4">Customer & Contact</th>
                <th className="py-3 px-4">Venue Location</th>
                <th className="py-3 px-4">Event Times</th>
                <th className="py-3 px-4">Booking Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {scheduleItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 text-xs">
                    No confirmed equipment dispatches for {selectedDate}.
                  </td>
                </tr>
              ) : (
                scheduleItems.map((entry) => {
                  const isChecked = !!checkedList[entry.id];

                  return (
                    <tr
                      key={entry.id}
                      className={`hover:bg-slate-50/60 transition ${
                        isChecked ? 'bg-emerald-50/40 text-slate-500' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => toggleCheck(entry.id)}
                          className="text-slate-400 hover:text-emerald-600 transition"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`font-bold block ${
                            isChecked ? 'line-through text-slate-400' : 'text-slate-900'
                          }`}
                        >
                          {entry.item_name}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="font-mono font-bold text-sm bg-slate-100 px-2 py-0.5 rounded">
                          {entry.quantity}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800 block">
                          {entry.customer_name}
                        </span>
                        <span className="text-[11px] text-slate-500">{entry.customer_phone}</span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1 text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          <span>{entry.location}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1 text-slate-700">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {entry.start_time} - {entry.end_time}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-semibold text-slate-700">
                          {entry.booking_number}
                        </span>
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
