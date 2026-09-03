import React, { useState } from 'react';
import { Palette, CheckCircle, Eye, RefreshCw, Sliders, ShieldCheck } from 'lucide-react';
import type { CompanyTemplateSettings } from '../types.ts';
import { updateTemplateSettings } from '../lib/api.ts';

interface TemplateCustomizerProps {
  settings: CompanyTemplateSettings;
  onRefresh: () => void;
}

export const TemplateCustomizer: React.FC<TemplateCustomizerProps> = ({ settings, onRefresh }) => {
  const [form, setForm] = useState<CompanyTemplateSettings>(settings);
  const [activePreview, setActivePreview] = useState<'quotation' | 'invoice'>('quotation');
  const [saving, setSaving] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  const handleChange = (key: keyof CompanyTemplateSettings, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await updateTemplateSettings(form);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Document Template Customizer
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Decoupled layout configuration for Quotations, Invoices, Bank Details, and Legal Terms.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {success && (
            <span className="text-xs font-bold text-emerald-600 flex items-center bg-emerald-50 px-3 py-1.5 rounded-lg">
              <CheckCircle className="w-4 h-4 mr-1 text-emerald-600" />
              Template Saved Successfully!
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Settings Form Column */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-6">
          {/* Company Branding Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-rose-600" />
              <span>Company Branding & Contact Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name</label>
                <input
                  type="text"
                  value={form.company_name}
                  onChange={(e) => handleChange('company_name', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company Tagline</label>
                <input
                  type="text"
                  value={form.tagline}
                  onChange={(e) => handleChange('tagline', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone / WhatsApp</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Physical Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Business Registration No
                </label>
                <input
                  type="text"
                  value={form.reg_number}
                  onChange={(e) => handleChange('reg_number', e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Brand Accent Color</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={form.primary_color}
                    onChange={(e) => handleChange('primary_color', e.target.value)}
                    className="w-8 h-8 rounded border border-slate-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={form.primary_color}
                    onChange={(e) => handleChange('primary_color', e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quotation Content Settings */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Palette className="w-4 h-4 text-rose-600" />
              <span>Quotation Layout & Terms</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quotation Document Header
              </label>
              <input
                type="text"
                value={form.quotation_header}
                onChange={(e) => handleChange('quotation_header', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Commercial Bank Account & Payment Instructions
              </label>
              <textarea
                rows={3}
                value={form.payment_instructions}
                onChange={(e) => handleChange('payment_instructions', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quotation Terms & Conditions
              </label>
              <textarea
                rows={4}
                value={form.quotation_terms}
                onChange={(e) => handleChange('quotation_terms', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden text-slate-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quotation Footer Note
              </label>
              <input
                type="text"
                value={form.quotation_footer}
                onChange={(e) => handleChange('quotation_footer', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
              />
            </div>
          </div>

          {/* Invoice Settings */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-rose-600" />
              <span>Official Invoice Settings</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Invoice Document Header
              </label>
              <input
                type="text"
                value={form.invoice_header}
                onChange={(e) => handleChange('invoice_header', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Invoice Terms & Equipment Safety Clause
              </label>
              <textarea
                rows={3}
                value={form.invoice_terms}
                onChange={(e) => handleChange('invoice_terms', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden text-slate-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Invoice Footer</label>
              <input
                type="text"
                value={form.invoice_footer}
                onChange={(e) => handleChange('invoice_footer', e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
          >
            {saving ? 'Updating Template Settings...' : 'Save Template Settings'}
          </button>
        </form>

        {/* Live Mini Preview Column */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center">
              <Eye className="w-4 h-4 mr-1.5 text-slate-500" />
              Live Template Preview
            </h3>

            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setActivePreview('quotation')}
                className={`px-3 py-1 rounded-md font-semibold transition ${
                  activePreview === 'quotation' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                }`}
              >
                Quotation
              </button>
              <button
                type="button"
                onClick={() => setActivePreview('invoice')}
                className={`px-3 py-1 rounded-md font-semibold transition ${
                  activePreview === 'invoice' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                }`}
              >
                Invoice
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs text-slate-800 text-[11px] space-y-4">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <div
                    className="w-7 h-7 rounded-lg text-white font-black text-xs flex items-center justify-center"
                    style={{ backgroundColor: form.primary_color }}
                  >
                    KJ
                  </div>
                  <span className="font-black text-sm text-slate-900">{form.company_name}</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">{form.tagline}</p>
                <p className="text-[10px] text-slate-500 mt-1">{form.phone}</p>
              </div>

              <div className="text-right">
                <span
                  className="font-black text-xs uppercase"
                  style={{ color: form.primary_color }}
                >
                  {activePreview === 'quotation' ? form.quotation_header : form.invoice_header}
                </span>
                <p className="font-mono text-[10px] text-slate-500 mt-0.5">
                  {activePreview === 'quotation' ? 'QT-2026-00001' : 'INV-2026-00001'}
                </p>
              </div>
            </div>

            {/* Mock Line Items */}
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 space-y-1">
              <div className="flex justify-between font-semibold text-slate-700">
                <span>1x Large Bouncy Castle</span>
                <span>Rs. 25,000</span>
              </div>
              <div className="flex justify-between font-semibold text-slate-700">
                <span>1x Generator 5KVA</span>
                <span>Rs. 8,500</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[10px]">
                <span>Delivery & Setup</span>
                <span>Rs. 4,000</span>
              </div>
              <div className="border-t border-slate-200 pt-1.5 flex justify-between font-black text-slate-900 text-xs">
                <span>Total</span>
                <span style={{ color: form.primary_color }}>Rs. 37,500</span>
              </div>
            </div>

            {/* Bank details */}
            <div className="p-2.5 bg-slate-50 rounded-lg text-[10px] text-slate-600 border border-slate-200/60">
              <span className="font-bold text-slate-900 block mb-0.5">Payment Instructions:</span>
              <p className="whitespace-pre-line leading-relaxed">{form.payment_instructions}</p>
            </div>

            {/* Terms */}
            <div className="text-[9px] text-slate-400 space-y-1">
              <span className="font-bold uppercase tracking-wider text-slate-500">Terms & Conditions</span>
              <p className="whitespace-pre-line leading-relaxed">
                {activePreview === 'quotation' ? form.quotation_terms : form.invoice_terms}
              </p>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 text-center text-[10px] text-slate-500">
              {activePreview === 'quotation' ? form.quotation_footer : form.invoice_footer}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
