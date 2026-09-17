import React, { useState, useEffect } from 'react';
import {
  Menu,
  Search,
  Plus,
  Bell,
  CheckCircle,
  FileSpreadsheet,
  Calendar,
  X,
  ArrowUpRight,
} from 'lucide-react';

import type {
  Quotation,
  Booking,
  Invoice,
  Payment,
  Product,
  Customer,
  DailyScheduleEntry,
  CompanyTemplateSettings,
  DashboardStats,
} from './types.ts';

import {
  fetchStats,
  fetchQuotations,
  fetchBookings,
  fetchInvoices,
  fetchPayments,
  fetchProducts,
  fetchCustomers,
  fetchDailySchedule,
  fetchTemplateSettings,
  searchAll,
} from './lib/api.ts';

import { Sidebar } from './components/Sidebar.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { QuotationsList } from './components/QuotationsList.tsx';
import { BookingsList } from './components/BookingsList.tsx';
import { AvailabilityCalendar } from './components/AvailabilityCalendar.tsx';
import { DailyEquipmentView } from './components/DailyEquipmentView.tsx';
import { InvoicesList } from './components/InvoicesList.tsx';
import { PaymentsList } from './components/PaymentsList.tsx';
import { ProductsManager } from './components/ProductsManager.tsx';
import { CustomersManager } from './components/CustomersManager.tsx';
import { TemplateCustomizer } from './components/TemplateCustomizer.tsx';
import { QuotationBuilderModal } from './components/QuotationBuilderModal.tsx';
import { DocumentPreviewModal } from './components/DocumentPreviewModal.tsx';
import { PaymentModal } from './components/PaymentModal.tsx';

const DEFAULT_STATS: DashboardStats = {
  todays_events_count: 0,
  upcoming_events_count: 0,
  pending_quotations_count: 0,
  unpaid_quotations_count: 0,
  confirmed_bookings_count: 0,
  todays_equipment_count: 0,
  outstanding_payments_amount: 0,
  monthly_revenue_amount: 0,
};

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Core entities state
  const [stats, setStats] = useState<DashboardStats>(DEFAULT_STATS);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [dailySchedule, setDailySchedule] = useState<DailyScheduleEntry[]>([]);
  const [templateSettings, setTemplateSettings] = useState<CompanyTemplateSettings | null>(null);

  // Modals state
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState<boolean>(false);
  const [selectedCustomerForQuote, setSelectedCustomerForQuote] = useState<Customer | null>(null);
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    type: 'quotation' | 'invoice';
    data: Quotation | Invoice | null;
  }>({
    isOpen: false,
    type: 'quotation',
    data: null,
  });

  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    quotation: Quotation | null;
    booking: Booking | null;
  }>({
    isOpen: false,
    quotation: null,
    booking: null,
  });

  // Global Search state (Requirement #25)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Toast banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadAllData = async () => {
    try {
      const [
        statsData,
        quotesData,
        bookingsData,
        invoicesData,
        paymentsData,
        productsData,
        customersData,
        scheduleData,
        templatesData,
      ] = await Promise.all([
        fetchStats().catch(() => DEFAULT_STATS),
        fetchQuotations().catch(() => []),
        fetchBookings().catch(() => []),
        fetchInvoices().catch(() => []),
        fetchPayments().catch(() => []),
        fetchProducts().catch(() => []),
        fetchCustomers().catch(() => []),
        fetchDailySchedule().catch(() => []),
        fetchTemplateSettings().catch(() => null),
      ]);

      setStats(statsData);
      setQuotations(quotesData);
      setBookings(bookingsData);
      setInvoices(invoicesData);
      setPayments(paymentsData);
      setProducts(productsData);
      setCustomers(customersData);
      setDailySchedule(scheduleData);
      if (templatesData) setTemplateSettings(templatesData);
    } catch (err) {
      console.error('Failed to load application data:', err);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Global Search debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const results = await searchAll(searchQuery);
        setSearchResults(results);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleOpenQuotationPreview = (quote: Quotation) => {
    setPreviewModal({
      isOpen: true,
      type: 'quotation',
      data: quote,
    });
  };

  const handleOpenInvoicePreview = (invoiceNumber: string) => {
    const inv = invoices.find((i) => i.invoice_number === invoiceNumber);
    if (inv) {
      setPreviewModal({
        isOpen: true,
        type: 'invoice',
        data: inv,
      });
    }
  };

  const handleConfirmBookingFromQuote = (quote: Quotation) => {
    setPaymentModal({
      isOpen: true,
      quotation: quote,
      booking: null,
    });
  };

  const handleRecordPaymentForBooking = (booking?: Booking) => {
    setPaymentModal({
      isOpen: true,
      quotation: null,
      booking: booking || null,
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans antialiased">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center space-x-2 text-xs font-semibold animate-in fade-in slide-in-from-top-3">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setSearchQuery('');
          setSearchResults(null);
        }}
        onOpenQuotationBuilder={() => setIsQuotationModalOpen(true)}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* Top App Header */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3 w-full max-w-xl">
            {/* Mobile menu trigger */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Global Search Bar (Requirement #25) */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Global search (quotation name, quote #, customer, phone, booking #)..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-100 hover:bg-slate-50 focus:bg-white border border-transparent focus:border-rose-400 rounded-xl focus:ring-2 focus:ring-rose-500/20 outline-hidden transition"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults(null);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Live Search Results Flyout */}
              {searchResults && (
                <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 max-h-[70vh] overflow-y-auto z-50 space-y-4">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100">
                    <span>Search Results for &quot;{searchQuery}&quot;</span>
                    <button
                      onClick={() => setSearchResults(null)}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      Close
                    </button>
                  </div>

                  {/* Quotation matches */}
                  {searchResults.quotations?.length > 0 && (
                    <div>
                      <span className="text-[11px] font-bold text-rose-600 block mb-1">
                        Quotations ({searchResults.quotations.length})
                      </span>
                      <div className="space-y-1">
                        {searchResults.quotations.map((q: Quotation) => (
                          <div
                            key={q.id}
                            onClick={() => {
                              handleOpenQuotationPreview(q);
                              setSearchResults(null);
                            }}
                            className="p-2 hover:bg-slate-50 rounded-lg text-xs flex justify-between items-center cursor-pointer"
                          >
                            <div>
                              <span className="font-bold text-slate-900 block">
                                {q.quote_name || `${q.event_date} - ${q.customer_name}`}
                              </span>
                              <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 mt-0.5">
                                <span className="font-mono text-slate-700 font-medium">
                                  {q.quote_number || q.quotation_number}
                                </span>
                                <span>•</span>
                                <span>{q.customer_name}</span>
                              </div>
                            </div>
                            <span className="font-semibold text-slate-700">{q.event_date}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Booking matches */}
                  {searchResults.bookings?.length > 0 && (
                    <div>
                      <span className="text-[11px] font-bold text-emerald-600 block mb-1">
                        Confirmed Bookings ({searchResults.bookings.length})
                      </span>
                      <div className="space-y-1">
                        {searchResults.bookings.map((b: Booking) => (
                          <div
                            key={b.id}
                            onClick={() => {
                              setCurrentTab('bookings');
                              setSearchResults(null);
                            }}
                            className="p-2 hover:bg-slate-50 rounded-lg text-xs flex justify-between items-center cursor-pointer"
                          >
                            <div>
                              <span className="font-mono font-bold text-slate-900">{b.booking_number}</span>
                              <span className="text-slate-600 ml-2">{b.customer_name}</span>
                            </div>
                            <span className="text-slate-500">{b.event_date}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Customer matches */}
                  {searchResults.customers?.length > 0 && (
                    <div>
                      <span className="text-[11px] font-bold text-blue-600 block mb-1">
                        Customers ({searchResults.customers.length})
                      </span>
                      <div className="space-y-1">
                        {searchResults.customers.map((c: Customer) => (
                          <div
                            key={c.id}
                            onClick={() => {
                              setCurrentTab('customers');
                              setSearchResults(null);
                            }}
                            className="p-2 hover:bg-slate-50 rounded-lg text-xs flex justify-between items-center cursor-pointer"
                          >
                            <span className="font-bold text-slate-900">{c.name}</span>
                            <span className="text-slate-500">{c.phone}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Invoice matches */}
                  {searchResults.invoices?.length > 0 && (
                    <div>
                      <span className="text-[11px] font-bold text-purple-600 block mb-1">
                        Invoices ({searchResults.invoices.length})
                      </span>
                      <div className="space-y-1">
                        {searchResults.invoices.map((inv: Invoice) => (
                          <div
                            key={inv.id}
                            onClick={() => {
                              handleOpenInvoicePreview(inv.invoice_number);
                              setSearchResults(null);
                            }}
                            className="p-2 hover:bg-slate-50 rounded-lg text-xs flex justify-between items-center cursor-pointer"
                          >
                            <span className="font-mono font-bold text-slate-900">{inv.invoice_number}</span>
                            <span className="text-slate-600">{inv.customer_name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Product matches */}
                  {searchResults.products?.length > 0 && (
                    <div>
                      <span className="text-[11px] font-bold text-indigo-600 block mb-1">
                        Equipment Products ({searchResults.products.length})
                      </span>
                      <div className="space-y-1">
                        {searchResults.products.map((p: Product) => (
                          <div
                            key={p.id}
                            onClick={() => {
                              setCurrentTab('products');
                              setSearchResults(null);
                            }}
                            className="p-2 hover:bg-slate-50 rounded-lg text-xs flex justify-between items-center cursor-pointer"
                          >
                            <span className="font-bold text-slate-900">{p.name}</span>
                            <span className="text-slate-500">{p.category}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick Header CTAs */}
          <div className="flex items-center space-x-3">
            <a
              href="/api/schedule/export-excel"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </a>

            <button
              onClick={() => setIsQuotationModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Quotation</span>
            </button>
          </div>
        </header>

        {/* Content Body Router */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">
          {currentTab === 'dashboard' && (
            <Dashboard
              stats={stats}
              bookings={bookings}
              quotations={quotations}
              dailySchedule={dailySchedule}
              payments={payments}
              products={products}
              onOpenQuotationBuilder={() => {
                setSelectedCustomerForQuote(null);
                setIsQuotationModalOpen(true);
              }}
              onNavigateTab={(tab) => setCurrentTab(tab)}
              onPreviewQuotation={handleOpenQuotationPreview}
              onRecordPayment={handleRecordPaymentForBooking}
            />
          )}

          {currentTab === 'quotations' && (
            <QuotationsList
              quotations={quotations}
              bookings={bookings}
              invoices={invoices}
              payments={payments}
              onOpenBuilder={() => {
                setSelectedCustomerForQuote(null);
                setIsQuotationModalOpen(true);
              }}
              onPreview={handleOpenQuotationPreview}
              onConfirmBooking={handleConfirmBookingFromQuote}
              onViewBooking={() => setCurrentTab('bookings')}
              onViewInvoice={handleOpenInvoicePreview}
              onRefresh={loadAllData}
            />
          )}

          {currentTab === 'bookings' && (
            <BookingsList
              bookings={bookings}
              invoices={invoices}
              onRecordPayment={handleRecordPaymentForBooking}
              onViewInvoice={handleOpenInvoicePreview}
              onRefresh={loadAllData}
            />
          )}

          {currentTab === 'availability' && (
            <AvailabilityCalendar
              onOpenQuotationBuilderForDate={(date) => {
                setSelectedCustomerForQuote(null);
                setIsQuotationModalOpen(true);
              }}
            />
          )}

          {currentTab === 'schedule' && (
            <DailyEquipmentView
              onSelectBooking={(bNum) => {
                setCurrentTab('bookings');
              }}
            />
          )}

          {currentTab === 'invoices' && (
            <BookingsList
              bookings={bookings}
              invoices={invoices}
              onRecordPayment={handleRecordPaymentForBooking}
              onViewInvoice={handleOpenInvoicePreview}
              onRefresh={loadAllData}
            />
          )}

          {currentTab === 'payments' && (
            <PaymentsList
              payments={payments}
              bookings={bookings}
              onOpenRecordPayment={handleRecordPaymentForBooking}
            />
          )}

          {currentTab === 'products' && (
            <ProductsManager products={products} onRefresh={loadAllData} />
          )}

          {currentTab === 'customers' && (
            <CustomersManager
              customers={customers}
              bookings={bookings}
              quotations={quotations}
              payments={payments}
              invoices={invoices}
              onRefresh={loadAllData}
              onSelectCustomerForQuote={(c) => {
                setSelectedCustomerForQuote(c);
                setIsQuotationModalOpen(true);
              }}
              onViewInvoice={handleOpenInvoicePreview}
              onRecordPayment={handleRecordPaymentForBooking}
            />
          )}

          {currentTab === 'templates' && templateSettings && (
            <TemplateCustomizer settings={templateSettings} onRefresh={loadAllData} />
          )}
        </main>
      </div>

      {/* 3-Step Quotation Builder Modal */}
      <QuotationBuilderModal
        isOpen={isQuotationModalOpen}
        initialCustomer={selectedCustomerForQuote}
        onClose={() => {
          setIsQuotationModalOpen(false);
          setSelectedCustomerForQuote(null);
        }}
        onSuccess={(newQuote) => {
          showToast(`Quotation ${newQuote.quotation_number} generated successfully!`);
          loadAllData();
          handleOpenQuotationPreview(newQuote);
        }}
      />

      {/* Document PDF/Print Preview Modal */}
      {templateSettings && (
        <DocumentPreviewModal
          isOpen={previewModal.isOpen}
          onClose={() => setPreviewModal({ isOpen: false, type: 'quotation', data: null })}
          documentType={previewModal.type}
          data={previewModal.data}
          templateSettings={templateSettings}
        />
      )}

      {/* Payment & Booking Confirmation Modal */}
      <PaymentModal
        isOpen={paymentModal.isOpen}
        onClose={() => setPaymentModal({ isOpen: false, quotation: null, booking: null })}
        quotation={paymentModal.quotation}
        booking={paymentModal.booking}
        payments={payments}
        onSuccess={(msg) => {
          showToast(msg || 'Payment recorded successfully. Booking confirmed.');
          loadAllData();
        }}
      />
    </div>
  );
}
