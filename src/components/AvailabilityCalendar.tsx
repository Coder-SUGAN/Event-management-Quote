import React, { useState, useEffect } from 'react';
import { Calendar, Search, AlertCircle, CheckCircle, Plus, Info } from 'lucide-react';
import type { ItemAvailability } from '../types.ts';
import { fetchAvailability, formatCurrency } from '../lib/api.ts';

interface AvailabilityCalendarProps {
  onOpenQuotationBuilderForDate?: (date: string) => void;
}

export const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
  onOpenQuotationBuilderForDate,
}) => {
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>('2026-09-15');
  const [availability, setAvailability] = useState<ItemAvailability[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  useEffect(() => {
    loadAvailability(selectedDate);
  }, [selectedDate]);

  const loadAvailability = async (date: string) => {
    try {
      setLoading(true);
      const data = await fetchAvailability(date);
      setAvailability(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['ALL', ...Array.from(new Set(availability.map((a) => a.product.category)))];

  const filtered = availability.filter(
    (item) => categoryFilter === 'ALL' || item.product.category === categoryFilter
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Equipment Availability Checker
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time calculation: Total Warehouse Inventory minus Confirmed Bookings on selected date.
          </p>
        </div>

        {onOpenQuotationBuilderForDate && (
          <button
            onClick={() => onOpenQuotationBuilderForDate(selectedDate)}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Quotation for {selectedDate}</span>
          </button>
        )}
      </div>

      {/* Date Selector Banner */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <Calendar className="w-5 h-5 text-rose-600 shrink-0" />
          <div className="flex items-center space-x-2">
            <label className="text-xs font-bold text-slate-700">Check Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden bg-slate-50"
            />
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <label className="text-xs text-slate-500 font-medium">Category:</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-hidden focus:ring-2 focus:ring-rose-500"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Availability Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Equipment / Product</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-center">Total Stock</th>
                <th className="py-3 px-4 text-center">Booked Units</th>
                <th className="py-3 px-4 text-center">Available Units</th>
                <th className="py-3 px-4 text-right">Daily Rate</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    Calculating availability...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    No products found.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.product.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 block">{item.product.name}</span>
                      {item.product.dimensions && (
                        <span className="text-[10px] text-slate-400 block">
                          {item.product.dimensions}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">{item.product.category}</td>

                    <td className="py-3.5 px-4 text-center">
                      <span className="font-semibold text-slate-700">{item.total_quantity}</span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`font-semibold ${
                          item.booked_quantity > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'
                        }`}
                      >
                        {item.booked_quantity}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`font-mono text-sm font-black px-2.5 py-0.5 rounded-lg ${
                          item.available_quantity === 0
                            ? 'bg-rose-100 text-rose-800'
                            : item.status === 'limited'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-emerald-100 text-emerald-900'
                        }`}
                      >
                        {item.available_quantity}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {formatCurrency(item.product.unit_price)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          item.available_quantity === 0
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : item.status === 'limited'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}
                      >
                        {item.available_quantity === 0
                          ? '🔴 NOT AVAILABLE'
                          : item.status === 'limited'
                          ? '🟡 LIMITED STOCK'
                          : '🟢 AVAILABLE'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
