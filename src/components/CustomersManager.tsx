import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Send,
  Mail,
  MapPin,
  Calendar,
  X,
  CreditCard,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  Edit3,
  FileCheck2,
  DollarSign,
  TrendingUp,
  MessageSquare,
  Building2,
  CalendarCheck,
} from 'lucide-react';
import type { Customer, Booking, Quotation, Payment, Invoice } from '../types.ts';
import { generateWhatsAppUrl, createCustomer, updateCustomer, formatCurrency } from '../lib/api.ts';

interface CustomersManagerProps {
  customers: Customer[];
  bookings: Booking[];
  quotations: Quotation[];
  payments: Payment[];
  invoices?: Invoice[];
  onRefresh: () => void;
  onSelectCustomerForQuote: (customer: Customer) => void;
  onViewInvoice?: (invoiceNumber: string) => void;
  onRecordPayment?: (booking: Booking) => void;
}

export const CustomersManager: React.FC<CustomersManagerProps> = ({
  customers,
  bookings,
  quotations,
  payments,
  invoices = [],
  onRefresh,
  onSelectCustomerForQuote,
  onViewInvoice,
  onRecordPayment,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'balance' | 'active'>('all');
  
  // Selected customer for 360 profile modal
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [profileTab, setProfileTab] = useState<'bookings' | 'quotes' | 'payments' | 'billing'>('bookings');

  // New Customer Modal
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [newWhatsapp, setNewWhatsapp] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newAddress, setNewAddress] = useState<string>('');
  const [newBillingDetails, setNewBillingDetails] = useState<string>('');
  const [newNotes, setNewNotes] = useState<string>('');
  const [savingNew, setSavingNew] = useState<boolean>(false);

  // Edit Customer Modal / Drawer
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editWhatsapp, setEditWhatsapp] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editAddress, setEditAddress] = useState<string>('');
  const [editBillingDetails, setEditBillingDetails] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  // Helper to compute metrics for a specific customer
  const getCustomerMetrics = (c: Customer) => {
    const custBookings = bookings.filter(
      (b) => b.customer_id === c.id || b.customer_phone === c.phone || b.customer_name.toLowerCase() === c.name.toLowerCase()
    );
    const custQuotes = quotations.filter(
      (q) => q.customer_id === c.id || q.customer_phone === c.phone || q.customer_name.toLowerCase() === c.name.toLowerCase()
    );
    const bookingIds = new Set(custBookings.map((b) => b.id));
    const custPayments = payments.filter(
      (p) => bookingIds.has(p.booking_id) || p.booking_number && custBookings.some((b) => b.booking_number === p.booking_number)
    );

    const nonCancelledBookings = custBookings.filter((b) => b.status !== 'Cancelled');
    const totalInvoiced = nonCancelledBookings.reduce((sum, b) => sum + b.total_amount, 0);
    const totalPaid = nonCancelledBookings.reduce((sum, b) => sum + b.amount_paid, 0);
    const outstandingBalance = nonCancelledBookings.reduce((sum, b) => sum + (b.balance || 0), 0);

    return {
      bookings: custBookings,
      quotations: custQuotes,
      payments: custPayments,
      totalBookings: custBookings.length,
      activeBookings: custBookings.filter((b) => b.status === 'Confirmed' || b.status === 'In Progress').length,
      totalInvoiced,
      totalPaid,
      outstandingBalance,
    };
  };

  // Filter customers list
  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      c.whatsapp.includes(searchTerm) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.address && c.address.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.billing_details && c.billing_details.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterType === 'balance') {
      const metrics = getCustomerMetrics(c);
      return metrics.outstandingBalance > 0;
    }
    if (filterType === 'active') {
      const metrics = getCustomerMetrics(c);
      return metrics.activeBookings > 0;
    }
    return true;
  });

  // Aggregate stats across all customers
  const totalCustomersCount = customers.length;
  const customersWithBalance = customers.filter((c) => getCustomerMetrics(c).outstandingBalance > 0).length;
  const totalOutstandingBalance = customers.reduce((sum, c) => sum + getCustomerMetrics(c).outstandingBalance, 0);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone) return;
    try {
      setSavingNew(true);
      const created = await createCustomer({
        name: newName,
        phone: newPhone,
        whatsapp: newWhatsapp || newPhone,
        email: newEmail,
        address: newAddress,
        billing_details: newBillingDetails,
        notes: newNotes,
      });
      setIsNewModalOpen(false);
      setNewName('');
      setNewPhone('');
      setNewWhatsapp('');
      setNewEmail('');
      setNewAddress('');
      setNewBillingDetails('');
      setNewNotes('');
      onRefresh();
      setActiveCustomer(created);
    } catch (err: any) {
      alert(err.message || 'Failed to create customer');
    } finally {
      setSavingNew(false);
    }
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setEditName(c.name);
    setEditPhone(c.phone);
    setEditWhatsapp(c.whatsapp || c.phone);
    setEditEmail(c.email || '');
    setEditAddress(c.address || '');
    setEditBillingDetails(c.billing_details || '');
    setEditNotes(c.notes || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer || !editName || !editPhone) return;
    try {
      setSavingEdit(true);
      const updated = await updateCustomer(editingCustomer.id, {
        name: editName,
        phone: editPhone,
        whatsapp: editWhatsapp || editPhone,
        email: editEmail,
        address: editAddress,
        billing_details: editBillingDetails,
        notes: editNotes,
      });
      setEditingCustomer(null);
      if (activeCustomer && activeCustomer.id === updated.id) {
        setActiveCustomer(updated);
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update customer');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <span>Customers</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Customer directory, contact details, booking history, quotations, payment records, and balances.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Registered Customers</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{totalCustomersCount}</div>
            <span className="text-[11px] text-slate-400">Total client profiles</span>
          </div>
          <div className="p-3 bg-slate-100 rounded-xl text-slate-700">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Clients with Balance</span>
            <div className="text-2xl font-black text-amber-600 mt-1">{customersWithBalance}</div>
            <span className="text-[11px] text-slate-400">Pending post-event settlement</span>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">Total Outstanding Balance</span>
            <div className="text-2xl font-black text-rose-600 mt-1">
              {formatCurrency(totalOutstandingBalance)}
            </div>
            <span className="text-[11px] text-slate-400">Due on setup or event delivery</span>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, phone, email, address..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <span className="text-xs font-semibold text-slate-400">Filter:</span>
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              filterType === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Customers ({customers.length})
          </button>
          <button
            onClick={() => setFilterType('balance')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              filterType === 'balance'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Outstanding Balance ({customersWithBalance})
          </button>
          <button
            onClick={() => setFilterType('active')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              filterType === 'active'
                ? 'bg-emerald-700 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Active Bookings
          </button>
        </div>
      </div>

      {/* Customer Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Customer Name & Contact</th>
                <th className="py-3.5 px-4">Address / Billing</th>
                <th className="py-3.5 px-4 text-center">Bookings & Quotes</th>
                <th className="py-3.5 px-4 text-right">Lifetime Spent</th>
                <th className="py-3.5 px-4 text-right">Outstanding Balance</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold">No customers found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {searchTerm ? 'Try adjusting your search criteria' : 'Add your first customer to get started'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                  const metrics = getCustomerMetrics(c);
                  const waUrl = generateWhatsAppUrl(
                    c.whatsapp || c.phone,
                    `Hello ${c.name}, greetings from Kids Jump 4 Joy! How may we assist with your party and event rentals?`
                  );

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50/75 transition cursor-pointer"
                      onClick={() => setActiveCustomer(c)}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 hover:text-rose-600 transition flex items-center space-x-1.5">
                              <span>{c.name}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-[11px] text-slate-500 mt-0.5">
                              <span className="font-medium text-slate-700">{c.phone}</span>
                              {c.email && (
                                <>
                                  <span>•</span>
                                  <span className="truncate max-w-[130px]">{c.email}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 max-w-[200px]">
                        {c.address ? (
                          <div className="flex items-start space-x-1 text-slate-700">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="truncate">{c.address}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">No address set</span>
                        )}
                        {c.billing_details && (
                          <div className="text-[11px] text-slate-500 truncate mt-0.5 flex items-center space-x-1">
                            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{c.billing_details}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4 text-center">
                        <div className="inline-flex items-center space-x-1.5">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-semibold text-[11px]">
                            {metrics.totalBookings} {metrics.totalBookings === 1 ? 'Booking' : 'Bookings'}
                          </span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md font-medium text-[11px]">
                            {metrics.quotations.length} {metrics.quotations.length === 1 ? 'Quote' : 'Quotes'}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-4 text-right font-bold text-slate-900">
                        {formatCurrency(metrics.totalInvoiced)}
                      </td>

                      <td className="py-4 px-4 text-right">
                        {metrics.outstandingBalance > 0 ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 font-bold rounded-lg text-xs">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{formatCurrency(metrics.outstandingBalance)}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 font-semibold rounded-lg text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>Settled (Rs. 0)</span>
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center space-x-1">
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noreferrer"
                            title="WhatsApp Chat"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                          >
                            <Send className="w-4 h-4" />
                          </a>

                          <button
                            onClick={() => onSelectCustomerForQuote(c)}
                            title="Create Quotation"
                            className="px-2.5 py-1 text-[11px] font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition"
                          >
                            <span>+ Quote</span>
                          </button>

                          <button
                            onClick={() => handleOpenEdit(c)}
                            title="Edit Details"
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setActiveCustomer(c)}
                            title="View 360° Profile"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
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

      {/* CUSTOMER 360° PROFILE MODAL / DRAWER */}
      {activeCustomer && (() => {
        const metrics = getCustomerMetrics(activeCustomer);
        const waUrl = generateWhatsAppUrl(
          activeCustomer.whatsapp || activeCustomer.phone,
          `Hello ${activeCustomer.name}, this is Kids Jump 4 Joy regarding your event bookings.`
        );

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
            <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="p-6 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white font-black text-lg flex items-center justify-center shadow-md">
                    {activeCustomer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-xl font-black tracking-tight">{activeCustomer.name}</h2>
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md text-[10px] font-bold">
                        Client #{activeCustomer.id.slice(-5)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-1">
                      <span className="flex items-center space-x-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{activeCustomer.phone}</span>
                      </span>
                      {activeCustomer.email && (
                        <span className="flex items-center space-x-1">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{activeCustomer.email}</span>
                        </span>
                      )}
                      {activeCustomer.address && (
                        <span className="flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{activeCustomer.address}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                  <button
                    onClick={() => {
                      onSelectCustomerForQuote(activeCustomer);
                      setActiveCustomer(null);
                    }}
                    className="inline-flex items-center space-x-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ New Quote</span>
                  </button>
                  <button
                    onClick={() => handleOpenEdit(activeCustomer)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition"
                    title="Edit Customer Info"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setActiveCustomer(null)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Financial KPI Banner */}
              <div className="bg-slate-50 border-b border-slate-200 p-4 sm:p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 shrink-0">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Lifetime Invoiced</span>
                  <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                    {formatCurrency(metrics.totalInvoiced)}
                  </div>
                  <span className="text-[10px] text-slate-400">{metrics.totalBookings} event(s) total</span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Total Paid</span>
                  <div className="text-base sm:text-lg font-black text-emerald-700 mt-0.5">
                    {formatCurrency(metrics.totalPaid)}
                  </div>
                  <span className="text-[10px] text-slate-400">Settled payments</span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Outstanding Balance</span>
                  <div className={`text-base sm:text-lg font-black mt-0.5 ${metrics.outstandingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {formatCurrency(metrics.outstandingBalance)}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {metrics.outstandingBalance > 0 ? 'Pending collection' : 'Fully settled'}
                  </span>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">Quotations</span>
                  <div className="text-base sm:text-lg font-black text-indigo-900 mt-0.5">
                    {metrics.quotations.length}
                  </div>
                  <span className="text-[10px] text-slate-400">Generated quotes</span>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="px-6 border-b border-slate-200 flex items-center space-x-6 shrink-0 bg-white">
                <button
                  onClick={() => setProfileTab('bookings')}
                  className={`py-3.5 text-xs font-bold border-b-2 transition flex items-center space-x-2 ${
                    profileTab === 'bookings'
                      ? 'border-rose-600 text-rose-600'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <CalendarCheck className="w-4 h-4" />
                  <span>Event & Booking History ({metrics.bookings.length})</span>
                </button>

                <button
                  onClick={() => setProfileTab('quotes')}
                  className={`py-3.5 text-xs font-bold border-b-2 transition flex items-center space-x-2 ${
                    profileTab === 'quotes'
                      ? 'border-rose-600 text-rose-600'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Quotations ({metrics.quotations.length})</span>
                </button>

                <button
                  onClick={() => setProfileTab('payments')}
                  className={`py-3.5 text-xs font-bold border-b-2 transition flex items-center space-x-2 ${
                    profileTab === 'payments'
                      ? 'border-rose-600 text-rose-600'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Payment Records ({metrics.payments.length})</span>
                </button>

                <button
                  onClick={() => setProfileTab('billing')}
                  className={`py-3.5 text-xs font-bold border-b-2 transition flex items-center space-x-2 ${
                    profileTab === 'billing'
                      ? 'border-rose-600 text-rose-600'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Billing & Notes</span>
                </button>
              </div>

              {/* Tab Contents */}
              <div className="p-6 overflow-y-auto grow bg-slate-50/50">
                {profileTab === 'bookings' && (
                  <div className="space-y-4">
                    {metrics.bookings.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                        <Calendar className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold text-xs">No bookings recorded for this customer yet.</p>
                      </div>
                    ) : (
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                            <tr>
                              <th className="py-3 px-4">Booking #</th>
                              <th className="py-3 px-4">Event Date & Location</th>
                              <th className="py-3 px-4">Reserved Equipment</th>
                              <th className="py-3 px-4 text-right">Total</th>
                              <th className="py-3 px-4 text-right">Paid</th>
                              <th className="py-3 px-4 text-right">Balance</th>
                              <th className="py-3 px-4 text-center">Status</th>
                              <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {metrics.bookings.map((b) => (
                              <tr key={b.id} className="hover:bg-slate-50/75 transition">
                                <td className="py-3.5 px-4 font-bold text-slate-900">
                                  {b.booking_number}
                                  {b.invoice_number && (
                                    <div className="text-[10px] text-slate-400 font-medium">{b.invoice_number}</div>
                                  )}
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="font-semibold text-slate-800">{b.event_date}</div>
                                  <div className="text-[11px] text-slate-500 truncate max-w-[150px]">{b.event_location}</div>
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="text-[11px] text-slate-600 truncate max-w-[160px]">
                                    {(b.items || []).map((i) => `${i.quantity}x ${i.product_name_snapshot}`).join(', ')}
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                                  {formatCurrency(b.total_amount)}
                                </td>
                                <td className="py-3.5 px-4 text-right font-medium text-emerald-700">
                                  {formatCurrency(b.amount_paid)}
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  {b.balance > 0 ? (
                                    <span className="font-bold text-rose-600">{formatCurrency(b.balance)}</span>
                                  ) : (
                                    <span className="text-emerald-600 font-semibold">Rs. 0</span>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    b.status === 'Confirmed'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : b.status === 'Completed'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}>
                                    {b.status}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right">
                                  <div className="inline-flex items-center space-x-1.5">
                                    {b.invoice_number && onViewInvoice && (
                                      <button
                                        onClick={() => onViewInvoice(b.invoice_number!)}
                                        className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                                        title="View Invoice"
                                      >
                                        <FileCheck2 className="w-4 h-4" />
                                      </button>
                                    )}
                                    {b.balance > 0 && onRecordPayment && (
                                      <button
                                        onClick={() => onRecordPayment(b)}
                                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-md text-[10px] transition"
                                      >
                                        Pay
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {profileTab === 'quotes' && (
                  <div className="space-y-4">
                    {metrics.quotations.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                        <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold text-xs">No previous quotations for this customer.</p>
                      </div>
                    ) : (
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                            <tr>
                              <th className="py-3 px-4">Quotation #</th>
                              <th className="py-3 px-4">Event Date</th>
                              <th className="py-3 px-4">Location</th>
                              <th className="py-3 px-4 text-right">Total Amount</th>
                              <th className="py-3 px-4 text-center">Status</th>
                              <th className="py-3 px-4 text-right">Valid Until</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {metrics.quotations.map((q) => (
                              <tr key={q.id} className="hover:bg-slate-50/75 transition">
                                <td className="py-3.5 px-4 font-bold text-slate-900">{q.quotation_number}</td>
                                <td className="py-3.5 px-4 text-slate-700">{q.event_date}</td>
                                <td className="py-3.5 px-4 text-slate-600">{q.event_location}</td>
                                <td className="py-3.5 px-4 text-right font-bold text-slate-900">{formatCurrency(q.total_amount || (q as any).total)}</td>
                                <td className="py-3.5 px-4 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    q.status === 'Accepted' || q.status === 'Converted to Booking'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : q.status === 'Draft'
                                      ? 'bg-slate-100 text-slate-700'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {q.status}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right text-slate-500">{q.valid_until || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {profileTab === 'payments' && (
                  <div className="space-y-4">
                    {metrics.payments.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
                        <CreditCard className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold text-xs">No payment records found for this customer.</p>
                      </div>
                    ) : (
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                            <tr>
                              <th className="py-3 px-4">Payment Date</th>
                              <th className="py-3 px-4">Booking #</th>
                              <th className="py-3 px-4">Method</th>
                              <th className="py-3 px-4">Reference / Notes</th>
                              <th className="py-3 px-4 text-right">Amount Paid</th>
                              <th className="py-3 px-4 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {metrics.payments.map((p) => (
                              <tr key={p.id} className="hover:bg-slate-50/75 transition">
                                <td className="py-3.5 px-4 font-semibold text-slate-800">{p.payment_date}</td>
                                <td className="py-3.5 px-4 font-bold text-slate-900">{p.booking_number}</td>
                                <td className="py-3.5 px-4 text-slate-700">{p.payment_method}</td>
                                <td className="py-3.5 px-4 text-slate-600">
                                  {p.transaction_reference || '—'}
                                  {p.payment_notes && (
                                    <div className="text-[10px] text-slate-400">{p.payment_notes}</div>
                                  )}
                                </td>
                                <td className="py-3.5 px-4 text-right font-bold text-emerald-700">
                                  {formatCurrency(p.amount)}
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                                    {p.payment_status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {profileTab === 'billing' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Billing Details */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                          <Building2 className="w-4 h-4 text-rose-600" />
                          <span>Billing & Tax Information</span>
                        </h3>
                      </div>
                      <div className="text-xs text-slate-600 space-y-2">
                        <div>
                          <span className="font-semibold text-slate-500 block text-[11px]">Primary Address:</span>
                          <p className="mt-0.5 font-medium text-slate-800">{activeCustomer.address || 'Not specified'}</p>
                        </div>
                        <div>
                          <span className="font-semibold text-slate-500 block text-[11px]">Billing / Company Information:</span>
                          <p className="mt-0.5 font-medium text-slate-800 whitespace-pre-wrap">
                            {activeCustomer.billing_details || 'No separate billing details recorded.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Customer Notes */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                          <MessageSquare className="w-4 h-4 text-indigo-600" />
                          <span>Customer Notes & Preferences</span>
                        </h3>
                        <button
                          onClick={() => handleOpenEdit(activeCustomer)}
                          className="text-[11px] font-bold text-rose-600 hover:text-rose-700"
                        >
                          Edit Notes
                        </button>
                      </div>
                      <div className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200 min-h-[90px] whitespace-pre-wrap">
                        {activeCustomer.notes || 'No internal notes saved for this customer. Click Edit Notes to add preferences, delivery guidelines, or special terms.'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ADD NEW CUSTOMER MODAL */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-black text-base">Add New Customer</h3>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Ruwan Jayawardena"
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="e.g. +94 77 123 4567"
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    WhatsApp Number
                  </label>
                  <input
                    type="text"
                    value={newWhatsapp}
                    onChange={(e) => setNewWhatsapp(e.target.value)}
                    placeholder="e.g. +94 77 123 4567 (defaults to phone)"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="e.g. customer@example.com"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Address / Venue</label>
                  <input
                    type="text"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="e.g. 145 Kandy Road, Kurunegala"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Billing Details</label>
                  <textarea
                    rows={2}
                    value={newBillingDetails}
                    onChange={(e) => setNewBillingDetails(e.target.value)}
                    placeholder="Company name, Tax / VAT number, or separate invoicing address"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Internal Notes</label>
                  <textarea
                    rows={2}
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="e.g. Preferred setup morning, kid's birthday, VIP customer"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingNew}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition"
                >
                  {savingNew ? 'Saving...' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CUSTOMER MODAL */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-black text-base">Edit Customer Details</h3>
              <button
                onClick={() => setEditingCustomer(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    WhatsApp Number
                  </label>
                  <input
                    type="text"
                    value={editWhatsapp}
                    onChange={(e) => setEditWhatsapp(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Address / Venue</label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Billing Details</label>
                  <textarea
                    rows={2}
                    value={editBillingDetails}
                    onChange={(e) => setEditBillingDetails(e.target.value)}
                    placeholder="Company name, Tax / VAT number, or separate invoicing address"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Internal Notes</label>
                  <textarea
                    rows={2}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Customer preferences, discount agreements, special terms"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
