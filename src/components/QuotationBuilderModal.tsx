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
} from 'lucide-react';
import type { Customer, Product, ItemAvailability, LineItem } from '../types.ts';
import { fetchCustomers, fetchAvailability, createQuotation, formatCurrency } from '../lib/api.ts';

interface QuotationBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newQuotation: any) => void;
}

export const QuotationBuilderModal: React.FC<QuotationBuilderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
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
  const [endTime, setEndTime] = useState<string>('18:00');
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
      unit_price: number;
      discount: number;
      total: number;
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
                total: safeQty * item.unit_price - item.discount,
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

    const newItem = {
      product_id: avail.product.id,
      product_name_snapshot: avail.product.name,
      quantity: 1,
      unit_price: avail.product.unit_price,
      discount: 0,
      total: avail.product.unit_price,
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
            total: Math.max(0, clamped * it.unit_price - it.discount),
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
          const safePrice = Math.max(0, price);
          return {
            ...it,
            unit_price: safePrice,
            total: Math.max(0, it.quantity * safePrice - it.discount),
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
          const safeDisc = Math.max(0, disc);
          return {
            ...it,
            discount: safeDisc,
            total: Math.max(0, it.quantity * it.unit_price - safeDisc),
          };
        }
        return it;
      })
    );
  };

  const handleRemoveItem = (productId: string) => {
    setSelectedItems(selectedItems.filter((i) => i.product_id !== productId));
  };

  // Calculations
  const itemsSubtotal = selectedItems.reduce((acc, it) => acc + it.total, 0);
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
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 uppercase tracking-wider">
              Step {step} of 3
            </span>
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

                  return (
                    <div
                      key={item.product.id}
                      className={`p-3 rounded-xl border transition flex flex-col justify-between ${
                        isAvailable
                          ? 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                          : 'border-rose-100 bg-rose-50/40 opacity-75'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
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
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100">
                        <span className="text-xs font-bold text-slate-900">
                          {formatCurrency(item.product.unit_price)}
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
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                Selected Quotation Items ({selectedItems.length})
              </h3>
              {selectedItems.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                  No equipment selected yet. Click &quot;Select&quot; on any available item above.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="p-2.5">Item</th>
                        <th className="p-2.5 text-center">Qty</th>
                        <th className="p-2.5 text-right">Unit Price</th>
                        <th className="p-2.5 text-right">Discount</th>
                        <th className="p-2.5 text-right">Total</th>
                        <th className="p-2.5 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedItems.map((item) => (
                        <tr key={item.product_id} className="hover:bg-slate-50/50">
                          <td className="p-2.5">
                            <p className="font-semibold text-slate-900">{item.product_name_snapshot}</p>
                            <span className="text-[10px] text-slate-400">Max avail: {item.available_quantity}</span>
                          </td>
                          <td className="p-2.5 text-center">
                            <input
                              type="number"
                              min="1"
                              max={item.available_quantity}
                              value={item.quantity}
                              onChange={(e) =>
                                handleQuantityChange(item.product_id, parseInt(e.target.value) || 1)
                              }
                              className="w-16 px-1.5 py-1 text-xs text-center border border-slate-300 rounded font-semibold focus:ring-1 focus:ring-rose-500"
                            />
                          </td>
                          <td className="p-2.5 text-right">
                            <input
                              type="number"
                              min="0"
                              value={item.unit_price}
                              onChange={(e) =>
                                handleUnitPriceChange(item.product_id, parseFloat(e.target.value) || 0)
                              }
                              className="w-20 px-1.5 py-1 text-xs text-right border border-slate-300 rounded focus:ring-1 focus:ring-rose-500"
                            />
                          </td>
                          <td className="p-2.5 text-right">
                            <input
                              type="number"
                              min="0"
                              value={item.discount}
                              onChange={(e) =>
                                handleItemDiscountChange(item.product_id, parseFloat(e.target.value) || 0)
                              }
                              placeholder="0"
                              className="w-16 px-1.5 py-1 text-xs text-right border border-slate-300 rounded focus:ring-1 focus:ring-rose-500 text-rose-600"
                            />
                          </td>
                          <td className="p-2.5 text-right font-bold text-slate-900">
                            {formatCurrency(item.total)}
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.product_id)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
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
