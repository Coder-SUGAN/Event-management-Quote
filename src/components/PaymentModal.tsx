import React, { useState } from 'react';
import { X, CreditCard, UploadCloud, CheckCircle, AlertCircle } from 'lucide-react';
import type { Quotation, Booking, PaymentMethod } from '../types.ts';
import { formatCurrency, recordPayment, confirmBookingFromQuotation } from '../lib/api.ts';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  // If provided, we are confirming a quotation into a booking
  quotation?: Quotation | null;
  // If provided, we are recording payment on existing booking
  booking?: Booking | null;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  quotation,
  booking,
}) => {
  const isConfirmingQuotation = !!quotation;
  const targetNumber = isConfirmingQuotation ? quotation?.quotation_number : booking?.booking_number;
  const customerName = isConfirmingQuotation ? quotation?.customer_name : booking?.customer_name;
  const totalAmount = isConfirmingQuotation ? quotation?.total_amount || 0 : booking?.total_amount || 0;
  const initialSuggestedAmount = isConfirmingQuotation
    ? quotation?.deposit_required || Math.round(totalAmount * 0.5)
    : booking?.balance || 0;

  const [amount, setAmount] = useState<number>(initialSuggestedAmount);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank Transfer');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [proofFileName, setProofFileName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      const initAmount = isConfirmingQuotation
        ? quotation?.deposit_required || Math.round((quotation?.total_amount || 0) * 0.5)
        : booking?.balance || 0;
      setAmount(initAmount);
      setTransactionRef(`TXN-${Math.floor(100000 + Math.random() * 900000)}`);
      setError(null);
    }
  }, [isOpen, quotation, booking]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProofFileName(e.target.files[0].name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setError('Please enter a valid payment amount greater than 0.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (isConfirmingQuotation && quotation) {
        await confirmBookingFromQuotation(quotation.id, {
          amount,
          payment_method: paymentMethod,
          transaction_reference: transactionRef,
          payment_notes: notes,
          payment_date: paymentDate,
          payment_proof_name: proofFileName || undefined,
        });
      } else if (booking) {
        await recordPayment({
          booking_id: booking.id,
          amount,
          payment_method: paymentMethod,
          payment_date: paymentDate,
          transaction_reference: transactionRef,
          payment_notes: notes,
          payment_proof_name: proofFileName || undefined,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Payment processing failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-rose-500/20 text-rose-400 rounded-lg">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">
                {isConfirmingQuotation ? 'Verify Payment & Confirm Booking' : 'Record Booking Payment'}
              </h3>
              <p className="text-xs text-slate-400">
                {customerName} • {targetNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Target Summary info */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-500 block">Total Event Value:</span>
              <span className="font-bold text-slate-900 text-sm">{formatCurrency(totalAmount)}</span>
            </div>
            <div>
              <span className="text-slate-500 block">
                {isConfirmingQuotation ? 'Required 50% Deposit:' : 'Remaining Balance:'}
              </span>
              <span className="font-bold text-rose-600 text-sm">
                {formatCurrency(initialSuggestedAmount)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount Received (LKR) *
              </label>
              <input
                type="number"
                min="1"
                step="100"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                required
                className="w-full px-3 py-2 text-sm font-semibold rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-hidden bg-white"
              >
                <option value="Bank Transfer">Commercial Bank Transfer</option>
                <option value="Cash">Cash in Hand</option>
                <option value="Online Payment">Online Payment / IPG</option>
                <option value="Other">Other Transfer / Cheque</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Date *</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tx Reference / Receipt No *
              </label>
              <input
                type="text"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="e.g. COMB-992140"
                required
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Deposit slip verified via WhatsApp"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Deposit Slip / Receipt Attachment
            </label>
            <label className="flex items-center justify-center p-3 border-2 border-dashed border-slate-300 hover:border-rose-400 rounded-xl cursor-pointer bg-slate-50/60 hover:bg-rose-50/30 transition text-xs text-slate-600">
              <UploadCloud className="w-4 h-4 mr-2 text-slate-400" />
              <span>{proofFileName ? `Selected: ${proofFileName}` : 'Click to attach deposit slip'}</span>
              <input type="file" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" />
            </label>
          </div>

          {isConfirmingQuotation && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1">
              <p className="font-bold flex items-center">
                <CheckCircle className="w-4 h-4 mr-1 text-emerald-600" />
                Automatic Booking & Invoice Generation
              </p>
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                Confirming will officially reserve equipment on the event date, generate booking ID{' '}
                <span className="font-mono font-semibold">BK-2026-XXXXX</span>, invoice{' '}
                <span className="font-mono font-semibold">INV-2026-XXXXX</span>, and synchronize the Daily Schedule.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition flex items-center space-x-1.5 disabled:opacity-50"
            >
              {loading ? (
                <span>Processing...</span>
              ) : (
                <span>{isConfirmingQuotation ? 'Confirm Booking & Reserve' : 'Save Payment'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
