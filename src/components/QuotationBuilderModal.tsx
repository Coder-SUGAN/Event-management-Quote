import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Calendar,
  Package,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  ChevronRight,
  ChevronLeft,
  DollarSign,
  Search,
  Sparkles,
  Info,
} from 'lucide-react';
import type { Customer, Product, ItemAvailability, LineItem } from '../types.ts';
import { fetchCustomers, fetchAvailability, createQuotation, formatCurrency } from '../lib/api.ts';
import { calculateEventDuration, calculateItemTotal, calculateSingleItemPricing, generateQuotationName } from '../lib/pricing.ts';

interface QuotationBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newQuotation: any) => void;
  initialCustomer?: Customer | null;
}

export const QuotationBuilderModal: React.FC<QuotationBuilderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialCustomer,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Customer state
  const [existingCustomers, setExistingCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerWhatsapp, setCustomerWhatsapp] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');

  // Event state
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const [eventDate, setEventDate] = useState<string>(tomorrow);
  const [startTime, setStartTime] = useState<string>('10:00');
  const [endTime, setEndTime] = useState<string>('15:00');
  const [eventLocation, setEventLocation] = useState<string>('');
  const [eventType, setEventType] = useState<string>("Kids Birthday Party");
  const [guestsCount, setGuestsCount] = useState<number>(50);
  const [specialRequirements, setSpecialRequirements] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Availability & Items state
  const [availabilityList, setAvailabilityList] = useState<ItemAvailability[]>([]);
  const [loadingAvail, setLoadingAvail] = useState<boolean>(false);
  const [selectedItems, setSelectedItems] = useState<
    Array<{
      product_id: string;
      product_name_snapshot: string;
      quantity: number;
      unit_price: number; // Base price for up to 3 hours
      additional_hourly_rate: number; // Configurable rate per additional hour after 3 hours
      discount: number;
      available_quantity: number;
      category?: string;
    }>
  >([]);

  // Charges state
  const [deliveryFee, setDeliveryFee] = useState<number>(2500);
  const [setupFee, setSetupFee] = useState<number>(1500);
  const [transportFee, setTransportFee] = useState<number>(0);
  const [otherCharges, setOtherCharges] = useState<number>(0);
  const [overallDiscount, setOverallDiscount] = useState<number>(0);
  const [customDeposit, setCustomDeposit] = useState<number | null>(null);

  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Dynamic duration calculation based on start & end time
  const durationInfo = calculateEventDuration(startTime, endTime);

  // Pre-fill initial customer if supplied
  useEffect(() => {
    if (initialCustomer && isOpen) {
      setSelectedCustomerId(initialCustomer.id);
      setCustomerName(initialCustomer.name);
      setCustomerPhone(initialCustomer.phone);
      setCustomerWhatsapp(initialCustomer.whatsapp || initialCustomer.phone);
      setCustomerEmail(initialCustomer.email || '');
      setCustomerAddress(initialCustomer.address || '');
    }
  }, [initialCustomer, isOpen]);

  // Load existing customers
  useEffect(() => {
    if (isOpen) {
      fetchCustomers().then(setExistingCustomers).catch(console.error);
    }
  }, [isOpen]);

  // Load availability when eventDate changes
  useEffect(() => {
    if (eventDate) {
      setLoadingAvail(true);
      fetchAvailability(eventDate)
        .then((data) => {
          setAvailabilityList(data);
          // Re-verify already selected items against new date availability
          setSelectedItems((prev) =>
            prev.map((item) => {
              const match = data.find((a) => a.product.id === item.product_id);
              const avail = match?.available_quantity || 0;
              const safeQty = Math.min(item.quantity, Math.max(1, avail));
              return {
                ...item,
                available_quantity: avail,
                quantity: safeQty,
              };
            })
          );
        })
        .catch((err) => console.error('Error fetching availability:', err))
        .finally(() => setLoadingAvail(false));
    }
  }, [eventDate]);

  if (!isOpen) return null;

  const handleSelectCustomer = (id: string) => {
    setSelectedCustomerId(id);
    const found = existingCustomers.find((c) => c.id === id);
    if (found) {
      setCustomerName(found.name);
      setCustomerPhone(found.phone);
      setCustomerWhatsapp(found.whatsapp || found.phone);
      setCustomerEmail(found.email || '');
      setCustomerAddress(found.address || '');
    }
  };

  const handleAddItem = (avail: ItemAvailability) => {
    if (avail.available_quantity <= 0) return;
    const exists = selectedItems.find((i) => i.product_id === avail.product.id);
    if (exists) {
      if (exists.quantity < avail.available_quantity) {
        handleQuantityChange(avail.product.id, exists.quantity + 1);
      }
      return;
    }

    const defaultHourlyRate =
      avail.product.additional_hourly_rate !== undefined &&
      avail.product.additional_hourly_rate !== null
        ? avail.product.additional_hourly_rate
        : Math.round(avail.product.unit_price * 0.2);

    const newItem = {
      product_id: avail.product.id,
      product_name_snapshot: avail.product.name,
      quantity: 1,
      unit_price: avail.product.unit_price,
      additional_hourly_rate: defaultHourlyRate,
      discount: 0,
      available_quantity: avail.available_quantity,
      category: avail.product.category,
    };
    setSelectedItems([...selectedItems, newItem]);
  };

  const handleQuantityChange = (productId: string, newQty: number) => {
    setSelectedItems((prev) =>
      prev.map((it) => {
        if (it.product_id === productId) {
          const clamped = Math.max(1, Math.min(newQty, it.available_quantity));
          return {
            ...it,
            quantity: clamped,
          };
        }
        return it;
      })
    );
  };

  const handleUnitPriceChange = (productId: string, price: number) => {
    setSelectedItems((prev) =>
      prev.map((it) => {
        if (it.product_id === productId) {
          return {
            ...it,
            unit_price: Math.max(0, price),
          };
        }
        return it;
      })
    );
  };

  const handleHourlyRateChange = (productId: string, rate: number) => {
    setSelectedItems((prev) =>
      prev.map((it) => {
        if (it.product_id === productId) {
          return {
            ...it,
            additional_hourly_rate: Math.max(0, rate),
          };
        }
        return it;
      })
    );
  };

  const handleItemDiscountChange = (productId: string, disc: number) => {
    setSelectedItems((prev) =>
      prev.map((it) => {
        if (it.product_id === productId) {
          return {
            ...it,
            discount: Math.max(0, disc),
          };
        }
        return it;
      })
    );
  };

  const handleRemoveItem = (productId: string) => {
    setSelectedItems(selectedItems.filter((i) => i.product_id !== productId));
  };

  // Calculations dynamically based on duration
  const itemsSubtotal = selectedItems.reduce((acc, it) => {
    const pricing = calculateItemTotal(
      it.unit_price,
      it.additional_hourly_rate,
      it.quantity,
      durationInfo.additionalHours,
      it.discount
    );
    return acc + pricing.total;
  }, 0);

  const totalAmount = Math.max(
    0,
    itemsSubtotal + deliveryFee + setupFee + transportFee + otherCharges - overallDiscount
  );
  const depositRequired =
    customDeposit !== null ? customDeposit : Math.round(totalAmount * 0.5);
  const remainingBalance = Math.max(0, totalAmount - depositRequired);

  const handleSubmit = async () => {
    if (!customerName || !customerPhone) {
      setError('Customer name and phone number are required.');
      setStep(1);
      return;
    }
    if (!eventDate || !eventLocation) {
      setError('Event date and location are required.');
      setStep(2);
      return;
    }
    if (!durationInfo.isValid) {
      setError(durationInfo.error || 'Event end time must be after start time.');
      setStep(2);
      return;
    }
    if (selectedItems.length === 0) {
      setError('Please add at least one equipment rental item.');
      setStep(3);
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const quote = await createQuotation({
        customer: {
          id: selectedCustomerId || undefined,
          name: customerName,
          phone: customerPhone,
          whatsapp: customerWhatsapp || customerPhone,
          email: customerEmail,
          address: customerAddress,
        },
        event: {
          date: eventDate,
          start_time: startTime,
          end_time: endTime,
          location: eventLocation,
          type: eventType,
          number_of_guests: guestsCount,
          special_requirements: specialRequirements,
          notes,
        },
        items: selectedItems.map((it) => ({
          product_id: it.product_id,
          quantity: it.quantity,
          unit_price: it.unit_price,
          additional_hourly_rate: it.additional_hourly_rate,
          discount: it.discount,
          category: it.category,
        })),
        charges: {
          delivery_fee: deliveryFee,
          setup_fee: setupFee,
          transport_fee: transportFee,
          other_charges: otherCharges,
          discount: overallDiscount,
          deposit_required: depositRequired,
        },
      });

      onSuccess(quote);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create quotation');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 uppercase tracking-wider">
                Step {step} of 3
              </span>
              {(customerName.trim() || eventDate) && (
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  Quotation Name: <strong className="text-white">{generateQuotationName(eventDate, customerName)}</strong>
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-white mt-1">Create Event Quotation</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50 text-xs font-semibold">
          <button
            onClick={() => setStep(1)}
            className={`py-3 px-4 flex items-center justify-center space-x-2 border-b-2 transition ${
              step === 1
                ? 'border-rose-600 text-rose-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>1. Customer Details</span>
          </button>
          <button
            onClick={() => setStep(2)}
            className={`py-3 px-4 flex items-center justify-center space-x-2 border-b-2 transition ${
              step === 2
                ? 'border-rose-600 text-rose-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>2. Event Specifications</span>
          </button>
          <button
            onClick={() => setStep(3)}
            className={`py-3 px-4 flex items-center justify-center space-x-2 border-b-2 transition ${
              step === 3
                ? 'border-rose-600 text-rose-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>3. Equipment & Pricing</span>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center space-x-2 text-xs text-rose-700">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Customer Information */}
        {step === 1 && (
          <div className="p-6 space-y-5">
            <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start space-x-2.5">
              <User className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">WhatsApp Inquiries First:</span> Select an existing customer
                or type the details received over WhatsApp. No customer login or registration needed.
              </div>
            </div>

            {existingCustomers.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quick Select Existing Customer (Optional)
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleSelectCustomer(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white outline-hidden"
                >
                  <option value="">-- Or enter new customer below --</option>
                  {existingCustomers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone}) - {c.address || 'No address'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer Full Name *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. John Perera"
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mobile Phone Number *
                </label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="e.g. +94 77 123 4567"
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  WhatsApp Number (for Quotation sending)
                </label>
                <input
                  type="text"
                  value={customerWhatsapp}
                  onChange={(e) => setCustomerWhatsapp(e.target.value)}
                  placeholder="e.g. +94 77 123 4567"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="e.g. customer@gmail.com"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer / Delivery Address
                </label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="e.g. No. 45, Temple Road, Kurunegala"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Event Details */}
        {step === 2 && (
          <div className="p-6 space-y-5">
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start space-x-2.5">
              <Calendar className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Inventory Checks Rely on Event Date:</span> Equipment
                availability is calculated automatically for the specific event date chosen below.
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Event Date *</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm font-semibold rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time *</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">End Time *</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                />
              </div>
            </div>

            {/* Event Duration Preview in Step 2 */}
            <div className="flex flex-wrap items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <span className="text-slate-600 font-medium">Calculated Event Duration:</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded-full ${
                    durationInfo.isValid
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {durationInfo.formattedDuration}
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                {durationInfo.isValid && durationInfo.additionalHours > 0 ? (
                  <span className="font-semibold text-amber-700">
                    Includes 3 hours base + {durationInfo.additionalHours} additional billable hour(s)
                  </span>
                ) : (
                  <span className="font-semibold text-emerald-700">
                    Fully within standard 3 hours base package
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Event Venue / Delivery Location *
                </label>
                <input
                  type="text"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  placeholder="e.g. Kurunegala Town Hall Grounds"
                  required
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Event Type</label>
                <input
                  type="text"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  placeholder="e.g. Child Birthday, School Sports Meet"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expected Guests / Kids
                </label>
                <input
                  type="number"
                  min="0"
                  value={guestsCount}
                  onChange={(e) => setGuestsCount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Power / Setup Conditions
                </label>
                <input
                  type="text"
                  value={specialRequirements}
                  onChange={(e) => setSpecialRequirements(e.target.value)}
                  placeholder="e.g. Grass ground, 230V outlet available within 15m"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Internal Quotation Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Customer wants setup completed 1 hour before start time"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Equipment Inventory & Real-Time Availability */}
        {step === 3 && (
          <div className="p-6 space-y-6 max-h-[68vh] overflow-y-auto">
            {/* Event Duration & Base Pricing Policy Banner */}
            <div className="p-4.5 bg-slate-900 text-white rounded-2xl border border-slate-800 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start space-x-3.5">
                  <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-xl mt-0.5 border border-rose-500/30">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
                        EVENT DURATION
                      </span>
                      <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono">
                        {startTime} – {endTime}
                      </span>
                    </div>
                    <h4 className="text-2xl font-black text-white mt-1 tracking-tight">
                      {durationInfo.formattedDuration}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2.5 mt-2">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 text-xs font-medium border border-slate-700">
                        Included: <strong className="ml-1 text-white">3 Hours</strong>
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${
                        durationInfo.additionalHours > 0
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        Additional: <strong className="ml-1">{durationInfo.additionalHours} Hours</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Inline Time Adjuster */}
                <div className="bg-slate-800/90 p-3 rounded-xl border border-slate-700/80 text-xs flex flex-col justify-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 mb-1.5">
                    Adjust Event Timings
                  </span>
                  <div className="flex items-center space-x-2">
                    <div>
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="px-2 py-1 bg-slate-900 border border-slate-600 rounded text-white text-xs font-semibold focus:ring-1 focus:ring-rose-500 outline-hidden"
                      />
                    </div>
                    <span className="text-slate-400 text-xs font-medium">to</span>
                    <div>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="px-2 py-1 bg-slate-900 border border-slate-600 rounded text-white text-xs font-semibold focus:ring-1 focus:ring-rose-500 outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Informational Policy Note */}
              <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <p className="flex items-center space-x-1.5 text-xs text-amber-200">
                  <Info className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-medium">
                    Equipment prices include up to 3 hours. Additional hourly charges apply after 3 hours.
                  </span>
                </p>
              </div>
            </div>

            {/* Real-time Inventory Catalog */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Available Equipment for {eventDate}
                </h3>
                {loadingAvail && <span className="text-xs text-rose-600 animate-pulse">Checking live availability...</span>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {availabilityList.map((item) => {
                  const isAvailable = item.available_quantity > 0;
                  const isLimited = item.status === 'limited';
                  const alreadySelected = selectedItems.find((s) => s.product_id === item.product.id);
                  const basePrice = item.product.unit_price;
                  const hourlyRate =
                    item.product.additional_hourly_rate !== undefined &&
                    item.product.additional_hourly_rate !== null
                      ? item.product.additional_hourly_rate
                      : Math.round(basePrice * 0.2);
                  const previewTotal = calculateItemTotal(
                    basePrice,
                    hourlyRate,
                    1,
                    durationInfo.additionalHours,
                    0
                  );

                  return (
                    <div
                      key={item.product.id}
                      className={`p-3.5 rounded-xl border transition flex flex-col justify-between ${
                        isAvailable
                          ? 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                          : 'border-rose-100 bg-rose-50/40 opacity-75'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                              isAvailable
                                ? isLimited
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            <span>
                              {isAvailable
                                ? isLimited
                                  ? `🟡 Limited (${item.available_quantity} left)`
                                  : `🟢 Available (${item.available_quantity}/${item.total_quantity})`
                                : `🔴 NOT AVAILABLE (0 left)`}
                            </span>
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                          {item.product.name}
                        </h4>
                        <p className="text-[11px] text-slate-500">{item.product.category}</p>

                        {/* Base & Hourly Price Tags */}
                        <div className="mt-2.5 p-2 bg-slate-50 rounded-lg border border-slate-100 space-y-1 text-[11px]">
                          <div className="flex justify-between text-slate-700">
                            <span className="text-slate-500">Base (up to 3 hrs):</span>
                            <span className="font-bold text-slate-900">{formatCurrency(basePrice)}</span>
                          </div>
                          <div className="flex justify-between text-slate-700">
                            <span className="text-slate-500">Extra per hour:</span>
                            <span className="font-semibold text-rose-600">+{formatCurrency(hourlyRate)}/hr</span>
                          </div>
                          {durationInfo.additionalHours > 0 && (
                            <div className="flex justify-between font-bold pt-1 border-t border-slate-200 text-slate-900">
                              <span className="text-slate-600">Total for {durationInfo.formattedDuration}:</span>
                              <span className="text-rose-700 font-black">{formatCurrency(previewTotal.total)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                        <span className="text-xs font-bold text-slate-900">
                          {durationInfo.additionalHours > 0 ? (
                            <span>{formatCurrency(previewTotal.total)} <span className="text-[10px] text-slate-500 font-normal">({durationInfo.formattedDuration})</span></span>
                          ) : (
                            <span>{formatCurrency(basePrice)} <span className="text-[10px] text-slate-500 font-normal">(3 hrs)</span></span>
                          )}
                        </span>
                        <button
                          type="button"
                          disabled={!isAvailable || (alreadySelected && alreadySelected.quantity >= item.available_quantity)}
                          onClick={() => handleAddItem(item)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center space-x-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{alreadySelected ? `Add (${alreadySelected.quantity})` : 'Select'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Items Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Selected Quotation Items ({selectedItems.length})
                </h3>
                {durationInfo.additionalHours > 0 && (
                  <span className="text-xs text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    Applying +{durationInfo.additionalHours} extra hour(s) rate
                  </span>
                )}
              </div>

              {selectedItems.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                  No equipment selected yet. Click &quot;Select&quot; on any available item above.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                      <tr>
                        <th className="p-3">Equipment / Service</th>
                        <th className="p-3 text-center">Qty</th>
                        <th className="p-3 text-right">Base Rate (3 hrs)</th>
                        <th className="p-3 text-right">Extra Rate (/hr)</th>
                        <th className="p-3 text-right">Duration Breakdown</th>
                        <th className="p-3 text-right">Discount</th>
                        <th className="p-3 text-right font-bold">Subtotal</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedItems.map((item) => {
                        const pricing = calculateSingleItemPricing({
                          basePrice: item.unit_price,
                          additionalHourlyCharge: item.additional_hourly_rate,
                          quantity: item.quantity,
                          eventDuration: durationInfo.totalHoursDecimal,
                          discount: item.discount,
                        });

                        return (
                          <tr key={item.product_id} className="hover:bg-slate-50/50">
                            <td className="p-3">
                              <p className="font-bold text-slate-900">{item.product_name_snapshot}</p>
                              <div className="flex items-center space-x-2 text-[10px] text-slate-500 mt-0.5">
                                {item.category && <span>{item.category}</span>}
                                <span>•</span>
                                <span>Max available: {item.available_quantity}</span>
                              </div>
                              <div className="mt-1 flex flex-wrap gap-x-2 text-[10px] text-slate-500">
                                <span>Event Duration: <strong className="text-slate-700">{durationInfo.formattedDuration}</strong></span>
                                <span>•</span>
                                <span>Additional Hours: <strong className={pricing.additionalHours > 0 ? 'text-amber-700' : 'text-slate-700'}>{pricing.additionalHours}</strong></span>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <input
                                type="number"
                                min="1"
                                max={item.available_quantity}
                                value={item.quantity}
                                onChange={(e) =>
                                  handleQuantityChange(item.product_id, parseInt(e.target.value) || 1)
                                }
                                className="w-14 px-1.5 py-1 text-xs text-center border border-slate-300 rounded font-semibold focus:ring-1 focus:ring-rose-500"
                              />
                            </td>
                            <td className="p-3 text-right">
                              <input
                                type="number"
                                min="0"
                                value={item.unit_price}
                                onChange={(e) =>
                                  handleUnitPriceChange(item.product_id, parseFloat(e.target.value) || 0)
                                }
                                title="Base price for up to 3 hours"
                                className="w-24 px-2 py-1 text-xs text-right border border-slate-300 rounded focus:ring-1 focus:ring-rose-500 font-mono font-medium"
                              />
                              <div className="text-[10px] text-slate-500 mt-0.5 font-medium">Rs. / 3 hrs</div>
                            </td>
                            <td className="p-3 text-right">
                              <input
                                type="number"
                                min="0"
                                value={item.additional_hourly_rate}
                                onChange={(e) =>
                                  handleHourlyRateChange(item.product_id, parseFloat(e.target.value) || 0)
                                }
                                title="Additional hourly charge after 3 hours"
                                className="w-20 px-2 py-1 text-xs text-right border border-slate-300 rounded focus:ring-1 focus:ring-rose-500 font-mono font-medium text-rose-700"
                              />
                              <div className="text-[10px] text-rose-600 mt-0.5 font-medium">Rs. / hr</div>
                            </td>
                            <td className="p-3 text-right">
                              {pricing.additionalHours > 0 ? (
                                <div className="text-[11px] space-y-0.5">
                                  <div className="text-slate-600">
                                    Base: {formatCurrency(pricing.baseCost)}
                                  </div>
                                  <div className="text-amber-700 font-semibold">
                                    Additional: {formatCurrency(pricing.additionalCost)} ({pricing.additionalHours}h @ {formatCurrency(item.additional_hourly_rate)}/hr)
                                  </div>
                                </div>
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium text-[11px] border border-emerald-200">
                                  Included (3 hrs)
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <input
                                type="number"
                                min="0"
                                value={item.discount}
                                onChange={(e) =>
                                  handleItemDiscountChange(item.product_id, parseFloat(e.target.value) || 0)
                                }
                                placeholder="0"
                                className="w-16 px-1.5 py-1 text-xs text-right border border-slate-300 rounded focus:ring-1 focus:ring-rose-500 text-rose-600 font-mono"
                              />
                            </td>
                            <td className="p-3 text-right font-bold text-slate-900 font-mono text-sm">
                              {formatCurrency(pricing.finalItemTotal)}
                            </td>
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.product_id)}
                                title="Remove item"
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Custom Charges & Discounts */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Delivery Fee (LKR)
                </label>
                <input
                  type="number"
                  min="0"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Setup & Labor Fee
                </label>
                <input
                  type="number"
                  min="0"
                  value={setupFee}
                  onChange={(e) => setSetupFee(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Transport / Distance
                </label>
                <input
                  type="number"
                  min="0"
                  value={transportFee}
                  onChange={(e) => setTransportFee(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Overall Discount (LKR)
                </label>
                <input
                  type="number"
                  min="0"
                  value={overallDiscount}
                  onChange={(e) => setOverallDiscount(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 text-rose-600 font-semibold"
                />
              </div>
            </div>

            {/* Auto Quotation Name Display */}
            <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Automatic Quotation Name:</span>
              <span className="font-mono font-bold text-slate-900 bg-white px-2.5 py-1 rounded border border-slate-300">
                {generateQuotationName(eventDate, customerName)}
              </span>
            </div>

            {/* Calculation Totals */}
            <div className="p-4 bg-slate-900 text-white rounded-xl flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <span className="text-xs text-slate-400 block">Total Quotation Amount</span>
                <span className="text-2xl font-black text-white">{formatCurrency(totalAmount)}</span>
              </div>

              <div className="flex items-center space-x-6 text-xs text-slate-300">
                <div>
                  <span className="block text-slate-400">50% Advance Deposit</span>
                  <span className="font-bold text-amber-400">{formatCurrency(depositRequired)}</span>
                </div>
                <div>
                  <span className="block text-slate-400">Balance on Setup</span>
                  <span className="font-bold text-white">{formatCurrency(remainingBalance)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
          <div>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev - 1) as any)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition flex items-center space-x-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Cancel
              </button>
            )}
          </div>

          <div>
            {step < 3 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1 && (!customerName || !customerPhone)) {
                    setError('Please provide customer name and phone number.');
                    return;
                  }
                  if (step === 2 && (!eventDate || !eventLocation)) {
                    setError('Please provide event date and venue location.');
                    return;
                  }
                  setError(null);
                  setStep((prev) => (prev + 1) as any);
                }}
                className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition flex items-center space-x-1"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={saving || selectedItems.length === 0}
                onClick={handleSubmit}
                className="px-6 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition flex items-center space-x-1.5 disabled:opacity-50"
              >
                {saving ? (
                  <span>Generating Quotation...</span>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Generate Quotation (QT-2026-XXXXX)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
