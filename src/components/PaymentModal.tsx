import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  Phone,
  User,
  FileText,
  FileCheck,
  ShieldCheck,
  Building2,
  ArrowRight,
  Info,
} from 'lucide-react';
import type {
  Quotation,
  Booking,
  PaymentMethod,
  PaymentType,
  PaymentStatus,
  Payment,
} from '../types.ts';
import { formatCurrency, recordPayment, confirmBookingFromQuotation } from '../lib/api.ts';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message?: string) => void;
  // If provided, we are confirming a quotation into a booking
  quotation?: Quotation | null;
  // If provided, we are recording payment on existing booking
  booking?: Booking | null;
  // All tracked payments
  payments?: Payment[];
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  quotation,
  booking,
  payments = [],
}) => {
  const isConfirmingQuotation = !!quotation;
  const targetNumber = isConfirmingQuotation
    ? quotation?.quotation_number
    : booking?.booking_number;
  const customerName = isConfirmingQuotation
    ? quotation?.customer_name
    : booking?.customer_name;
  const customerPhone = isConfirmingQuotation
    ? quotation?.customer_phone || quotation?.customer_whatsapp
    : booking?.customer_phone || booking?.customer_whatsapp;
  const eventDate = isConfirmingQuotation ? quotation?.event_date : booking?.event_date;
  const eventTime = isConfirmingQuotation
    ? quotation?.event_duration_formatted ||
      `${quotation?.event_start_time || '10:00'} - ${quotation?.event_end_time || '13:00'}`
    : booking?.event_duration_formatted ||
      `${booking?.event_start_time || '10:00'} - ${booking?.event_end_time || '13:00'}`;

  const totalAmount = isConfirmingQuotation
    ? quotation?.total_amount || 0
    : booking?.total_amount || 0;

  // Calculate already paid from payment records if available, otherwise from quote/booking property
  const relevantPayments = payments.filter((p) =>
    isConfirmingQuotation
      ? p.quotation_id === quotation?.id ||
        (quotation?.converted_booking_id && p.booking_id === quotation.converted_booking_id)
      : p.booking_id === booking?.id
  );

  const amountAlreadyPaid =
    relevantPayments.length > 0
      ? relevantPayments.reduce((acc, p) => acc + p.amount, 0)
      : isConfirmingQuotation
      ? quotation?.amount_paid || quotation?.total_paid || 0
      : booking?.amount_paid || 0;

  const requiredDeposit = isConfirmingQuotation
    ? quotation?.deposit_required || Math.round(totalAmount * 0.5)
    : booking?.deposit_required || Math.round(totalAmount * 0.5);

  const defaultDepositNeeded = Math.max(0, requiredDeposit - amountAlreadyPaid);
  const fullBalanceNeeded = Math.max(0, totalAmount - amountAlreadyPaid);

  // Form states
  const [paymentType, setPaymentType] = useState<PaymentType>('Deposit');
  const [amount, setAmount] = useState<number>(defaultDepositNeeded || requiredDeposit);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank Transfer');
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [proofFileName, setProofFileName] = useState<string>('');
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Synchronize on modal open or quote switch
  useEffect(() => {
    if (isOpen) {
      const needed = Math.max(0, requiredDeposit - amountAlreadyPaid);
      const initialAmt = needed > 0 ? needed : fullBalanceNeeded > 0 ? fullBalanceNeeded : 0;
      setPaymentType(needed > 0 ? 'Deposit' : 'Full Payment');
      setAmount(initialAmt);
      setPaymentMethod('Bank Transfer');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setTransactionRef(`TXN-${Math.floor(100000 + Math.random() * 900000)}`);
      setNotes('');
      setProofFileName('');
      setProofPreviewUrl('');
      setError(null);
    }
  }, [isOpen, quotation, booking, amountAlreadyPaid, requiredDeposit, fullBalanceNeeded]);

  if (!isOpen) return null;

  // Live calculations
  const parsedAmount = Number(amount) || 0;
  const liveTotalPaid = amountAlreadyPaid + parsedAmount;
  const liveRemainingBalance = Math.max(0, totalAmount - liveTotalPaid);

  // Projected statuses
  let projectedPaymentStatus: PaymentStatus = 'Unpaid';
  if (liveTotalPaid >= totalAmount && totalAmount > 0) {
    projectedPaymentStatus = 'Fully Paid';
  } else if (liveTotalPaid >= requiredDeposit && requiredDeposit > 0) {
    projectedPaymentStatus = 'Deposit Paid';
  } else if (liveTotalPaid > 0) {
    projectedPaymentStatus = 'Partially Paid';
  }

  const isDepositRequirementMet = liveTotalPaid >= requiredDeposit;
  const projectedBookingStatus = isDepositRequirementMet ? 'Confirmed' : 'Pending Payment';

  // Handle payment type change helper
  const handlePaymentTypeChange = (type: PaymentType) => {
    setPaymentType(type);
    setError(null);
    if (type === 'Deposit') {
      setAmount(Math.max(0, requiredDeposit - amountAlreadyPaid));
    } else if (type === 'Full Payment' || type === 'Balance Payment') {
      setAmount(Math.max(0, totalAmount - amountAlreadyPaid));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProofFileName(file.name);
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setProofPreviewUrl(url);
      } else {
        setProofPreviewUrl('');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (parsedAmount <= 0) {
      setError('Please enter a valid payment amount greater than Rs. 0.');
      return;
    }

    // Strict validation as per prompt:
    // "If the payment is below the required deposit: Do NOT confirm the booking. Show validation message."
    if (isConfirmingQuotation && !isDepositRequirementMet) {
      setError(
        'Required deposit has not been reached. Please enter a valid payment amount.'
      );
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (isConfirmingQuotation && quotation) {
        await confirmBookingFromQuotation(quotation.id, {
          amount: parsedAmount,
          payment_type: paymentType,
          payment_method: paymentMethod,
          payment_date: paymentDate,
          transaction_reference: transactionRef,
          reference_number: transactionRef,
          payment_notes: notes,
          notes: notes,
          payment_proof_name: proofFileName || undefined,
          payment_proof_url: proofPreviewUrl || proofFileName || undefined,
          created_by: 'Admin (Staff)',
        });
      } else if (booking) {
        await recordPayment({
          booking_id: booking.id,
          amount: parsedAmount,
          payment_method: paymentMethod,
          payment_date: paymentDate,
          transaction_reference: transactionRef,
          payment_notes: notes,
          payment_proof_name: proofFileName || undefined,
        });
      }

      onSuccess('Payment recorded successfully. Booking confirmed.');
      onClose();
    } catch (err: any) {
      console.error('Payment submission error:', err);
      setError(err.message || 'Payment recording failed. Please verify the details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="payment_details_modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-bold text-base tracking-tight">Payment Details</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-rose-400 border border-slate-700">
                  {targetNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isConfirmingQuotation
                  ? 'Verify advance deposit or payment to confirm official booking & reserve inventory'
                  : 'Record follow-up payment or balance settlement'}
              </p>
            </div>
          </div>
          <button
            id="close_payment_modal_btn"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Error Banner */}
          {error && (
            <div
              id="payment_validation_error"
              className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-2.5 text-xs text-rose-800 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Validation Alert</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Event & Customer Quick Overview */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-slate-500 block text-[11px]">Customer Name</span>
                  <span className="font-bold text-slate-900">{customerName || 'N/A'}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-slate-500 block text-[11px]">Customer Phone</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {customerPhone || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-slate-500 block text-[11px]">Event Date</span>
                  <span className="font-bold text-slate-900">{eventDate || 'N/A'}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                <div>
                  <span className="text-slate-500 block text-[11px]">Event Time</span>
                  <span className="font-semibold text-slate-800">{eventTime || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4-Stat Financial Summary Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">
                Total Amount
              </span>
              <span className="text-sm font-black text-slate-900 mt-0.5 block">
                {formatCurrency(totalAmount)}
              </span>
            </div>

            <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl">
              <span className="text-[10px] text-amber-700 uppercase tracking-wider font-semibold block">
                Required Deposit
              </span>
              <span className="text-sm font-black text-amber-900 mt-0.5 block">
                {formatCurrency(requiredDeposit)}
              </span>
            </div>

            <div className="p-3 bg-blue-50/60 border border-blue-200/80 rounded-xl">
              <span className="text-[10px] text-blue-700 uppercase tracking-wider font-semibold block">
                Already Paid
              </span>
              <span className="text-sm font-black text-blue-900 mt-0.5 block">
                {formatCurrency(amountAlreadyPaid)}
              </span>
            </div>

            <div className="p-3 bg-rose-50/60 border border-rose-200/80 rounded-xl">
              <span className="text-[10px] text-rose-700 uppercase tracking-wider font-semibold block">
                Remaining Balance
              </span>
              <span className="text-sm font-black text-rose-900 mt-0.5 block">
                {formatCurrency(liveRemainingBalance)}
              </span>
            </div>
          </div>

          {/* Dynamic Status Projection Banner */}
          <div className="flex flex-wrap items-center justify-between p-3 bg-slate-100/80 border border-slate-200 rounded-xl text-xs gap-2">
            <div className="flex items-center space-x-2">
              <span className="text-slate-600 font-medium">Projected Booking Status:</span>
              <span
                className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                  isDepositRequirementMet
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current mr-1"></span>
                {projectedBookingStatus}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-slate-600 font-medium">Projected Payment Status:</span>
              <span
                className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                  projectedPaymentStatus === 'Fully Paid'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : projectedPaymentStatus === 'Deposit Paid'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : projectedPaymentStatus === 'Partially Paid'
                    ? 'bg-orange-100 text-orange-800 border border-orange-300'
                    : 'bg-slate-200 text-slate-700 border border-slate-300'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current mr-1"></span>
                {projectedPaymentStatus}
              </span>
            </div>
          </div>

          {/* Form */}
          <form id="payment_details_form" onSubmit={handleSubmit} className="space-y-4">
            {/* Payment Type Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Payment Type *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(
                  [
                    { id: 'Deposit', label: 'Deposit', badge: '50% Minimum' },
                    { id: 'Partial Payment', label: 'Partial Payment', badge: 'Custom' },
                    { id: 'Full Payment', label: 'Full Payment', badge: '100% Total' },
                    { id: 'Balance Payment', label: 'Balance Payment', badge: 'Settle Due' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handlePaymentTypeChange(t.id)}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      paymentType === t.id
                        ? 'bg-rose-50 border-rose-500 text-rose-900 shadow-xs ring-1 ring-rose-500'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-bold text-xs">{t.label}</span>
                    <span
                      className={`text-[9px] font-semibold mt-1 ${
                        paymentType === t.id ? 'text-rose-600' : 'text-slate-400'
                      }`}
                    >
                      {t.badge}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount Paid & Payment Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="amount_paid_input"
                    className="text-xs font-bold text-slate-700"
                  >
                    Amount Paid (Rs.) *
                  </label>
                  <div className="space-x-1">
                    <button
                      type="button"
                      onClick={() => setAmount(Math.max(0, requiredDeposit - amountAlreadyPaid))}
                      className="text-[10px] font-semibold text-rose-600 hover:underline"
                    >
                      Deposit ({formatCurrency(requiredDeposit)})
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setAmount(Math.max(0, totalAmount - amountAlreadyPaid))}
                      className="text-[10px] font-semibold text-rose-600 hover:underline"
                    >
                      Full ({formatCurrency(totalAmount)})
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                    Rs.
                  </span>
                  <input
                    id="amount_paid_input"
                    type="number"
                    min="1"
                    step="100"
                    value={amount || ''}
                    onChange={(e) => {
                      setAmount(Number(e.target.value));
                      setError(null);
                    }}
                    required
                    placeholder="Enter amount"
                    className="w-full pl-9 pr-3 py-2.5 text-sm font-bold rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-hidden bg-white shadow-xs"
                  />
                </div>
                {isConfirmingQuotation && !isDepositRequirementMet && (
                  <p className="text-[11px] text-rose-600 mt-1 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1 shrink-0" />
                    Required deposit is {formatCurrency(requiredDeposit)}. Payment must reach this
                    amount to confirm.
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="payment_method_select"
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  Payment Method *
                </label>
                <select
                  id="payment_method_select"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2.5 text-xs font-medium rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-hidden bg-white shadow-xs"
                >
                  <option value="Cash">Cash in Hand</option>
                  <option value="Bank Transfer">Commercial / Sampath Bank Transfer</option>
                  <option value="Card">Credit / Debit Card</option>
                  <option value="Other">Other (Cheque / Online QR)</option>
                </select>
              </div>
            </div>

            {/* Payment Date & Reference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="payment_date_input"
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  Payment Date *
                </label>
                <input
                  id="payment_date_input"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 text-xs font-medium rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-hidden bg-white shadow-xs"
                />
              </div>

              <div>
                <label
                  htmlFor="transaction_ref_input"
                  className="block text-xs font-bold text-slate-700 mb-1"
                >
                  Payment Reference / Transaction ID *
                </label>
                <input
                  id="transaction_ref_input"
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="e.g. COMB-992140 / CASH-01"
                  required
                  className="w-full px-3 py-2.5 text-xs font-mono font-medium rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-hidden bg-white shadow-xs"
                />
              </div>
            </div>

            {/* Payment Notes */}
            <div>
              <label
                htmlFor="payment_notes_input"
                className="block text-xs font-bold text-slate-700 mb-1"
              >
                Payment Notes
              </label>
              <input
                id="payment_notes_input"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Advance deposit slip verified via WhatsApp"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-hidden bg-white shadow-xs"
              />
            </div>

            {/* Upload Payment Proof / Receipt */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Upload Payment Proof / Receipt
              </label>
              <label className="flex flex-col items-center justify-center p-3.5 border-2 border-dashed border-slate-300 hover:border-rose-400 rounded-xl cursor-pointer bg-slate-50/70 hover:bg-rose-50/30 transition text-xs text-slate-600">
                <UploadCloud className="w-5 h-5 mb-1 text-slate-400" />
                <span className="font-semibold text-slate-700">
                  {proofFileName ? proofFileName : 'Click to select deposit slip or payment proof'}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  Supports JPG, PNG, WebP, PDF (receipts, bank slips)
                </span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              {proofFileName && (
                <div className="flex items-center justify-between text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg mt-1 border border-emerald-200">
                  <span className="flex items-center">
                    <FileCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    {proofFileName}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setProofFileName('');
                      setProofPreviewUrl('');
                    }}
                    className="text-rose-600 hover:underline text-[10px] font-bold"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {/* Automatic Reservation Confirmation Callout */}
            {isConfirmingQuotation && (
              <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1">
                <p className="font-bold flex items-center">
                  <ShieldCheck className="w-4 h-4 mr-1 text-emerald-600 shrink-0" />
                  Inventory Protection & Automated Booking Generation
                </p>
                <p className="text-[11px] text-emerald-700 leading-relaxed">
                  Saving this payment automatically transitions quotation status to{' '}
                  <span className="font-bold">🟢 Confirmed</span>, locks equipment for event date{' '}
                  <span className="font-semibold">{eventDate}</span>, issues Booking ID{' '}
                  <span className="font-mono font-bold">BK-2026-XXXXX</span>, Invoice{' '}
                  <span className="font-mono font-bold">INV-2026-XXXXX</span>, and logs the staff
                  confirmation record.
                </p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
              <button
                id="cancel_payment_btn"
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                id="save_payment_confirm_btn"
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm hover:shadow-md transition flex items-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <span>Processing Payment...</span>
                ) : (
                  <>
                    <span>
                      {isConfirmingQuotation
                        ? 'Save Payment & Confirm Booking'
                        : 'Save Payment Record'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
