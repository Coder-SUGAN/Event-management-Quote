import React, { useState } from 'react';
import { FileCheck, Search, Printer, Eye, Download, Send } from 'lucide-react';
import type { Invoice } from '../types.ts';
import { formatCurrency, generateWhatsAppUrl } from '../lib/api.ts';

interface InvoicesListProps {
  invoices: Invoice[];
  onPreviewInvoice: (invoice: Invoice) => void;
}

export const InvoicesList: React.FC<InvoicesListProps> = ({ invoices, onPreviewInvoice }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filtered = invoices.filter((i) => {
    return (
      i.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.booking_number.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Official Invoices</h1>
          <p className="text-xs text-slate-500 mt-1">
            Generated tax invoices, receipts, and payment settlements.
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by invoice #, customer, booking number..."
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
                <th className="py-3 px-4">Invoice No</th>
                <th className="py-3 px-4">Booking Ref</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Event Date</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Balance</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                    No invoices generated yet.
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => {
                  const waMsg = `Hello ${inv.customer_name}! 🎈 Kids Jump 4 Joy official invoice (${inv.invoice_number}) for event date ${inv.event_date}. Total: ${formatCurrency(inv.total)}, Paid: ${formatCurrency(inv.amount_paid)}, Balance Due: ${formatCurrency(inv.balance)}. Thank you!`;
                  const waUrl = generateWhatsAppUrl(inv.customer_phone, waMsg);

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {inv.invoice_number}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600">{inv.booking_number}</td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">{inv.customer_name}</td>
                      <td className="py-3.5 px-4 text-slate-700">{inv.event_date}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        {formatCurrency(inv.total)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-emerald-600 font-semibold">
                        {formatCurrency(inv.amount_paid)}
                      </td>
                      <td className="py-3.5 px-4 text-right text-rose-600 font-bold">
                        {formatCurrency(inv.balance)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            inv.status === 'Paid'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : inv.status === 'Partially Paid'
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-rose-100 text-rose-800 border-rose-300'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center space-x-1.5">
                          <button
                            onClick={() => onPreviewInvoice(inv)}
                            title="Print / View Invoice"
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noreferrer"
                            title="Send Invoice to WhatsApp"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                          >
                            <Send className="w-4 h-4" />
                          </a>
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
