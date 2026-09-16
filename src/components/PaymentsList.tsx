import React, { useState } from 'react';
import { CreditCard, Search, Plus, CheckCircle, FileText, Calendar } from 'lucide-react';
import type { Payment, Booking } from '../types.ts';
import { formatCurrency } from '../lib/api.ts';

interface PaymentsListProps {
  payments: Payment[];
  bookings: Booking[];
  onOpenRecordPayment: (booking?: Booking) => void;
}

export const PaymentsList: React.FC<PaymentsListProps> = ({
  payments,
  bookings,
  onOpenRecordPayment,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filtered = payments.filter((p) => {
    return (
      p.booking_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.transaction_reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.payment_method.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.payment_notes && p.payment_notes.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Payments</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track bank deposits, cash advances, customer receipts, and invoice settlements.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="px-3.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
            <span className="text-[11px] text-emerald-600 block">Total Revenue Recorded:</span>
            <span className="font-bold text-emerald-800 text-sm">{formatCurrency(totalCollected)}</span>
          </div>

          <button
            onClick={() => onOpenRecordPayment()}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search payments by booking #, transaction reference, method..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 outline-hidden"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Payment Date</th>
                <th className="py-3 px-4">Booking Ref</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Transaction Reference</th>
                <th className="py-3 px-4 text-right">Amount Received</th>
                <th className="py-3 px-4">Notes & Attachments</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    No payment records found.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{p.payment_date}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {p.booking_number}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">{p.payment_method}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">
                      {p.transaction_reference || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-emerald-700 text-sm">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <p className="line-clamp-1">{p.payment_notes || '—'}</p>
                      {p.payment_proof_name && (
                        <span className="text-[10px] text-blue-600 font-medium">
                          📎 {p.payment_proof_name}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle className="w-3 h-3" />
                        <span>Verified</span>
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
