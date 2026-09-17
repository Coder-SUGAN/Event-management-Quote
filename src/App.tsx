import React, { useState, useEffect, useCallback } from 'react';
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
  LogIn,
  LogOut,
  User,
  ShieldCheck,
  Database,
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

import { useAuth } from './lib/authContext.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { SupabaseSchemaModal } from './components/SupabaseSchemaModal.tsx';
import { getMissingTables } from './lib/supabase.ts';
import { exportScheduleToExcel } from './lib/excelExport.ts';

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

// Route mapper for direct URL navigation
function getTabFromPathname(path: string): { tab: string; openAuth?: 'login' | 'signup' } {
  const clean = path.toLowerCase().replace(/^\/+|\/+$/g, '');
  if (clean === 'login') return { tab: 'dashboard', openAuth: 'login' };
  if (clean === 'signup') return { tab: 'dashboard', openAuth: 'signup' };
  if (clean === 'quotation' || clean === 'quotations') return { tab: 'quotations' };
  if (clean === 'inventory' || clean === 'products') return { tab: 'products' };
  if (clean === 'customers') return { tab: 'customers' };
  if (clean === 'bookings') return { tab: 'bookings' };
  if (clean === 'invoice' || clean === 'invoices') return { tab: 'invoices' };
  if (clean === 'event-schedule' || clean === 'schedule') return { tab: 'schedule' };
  if (clean === 'availability') return { tab: 'availability' };
  if (clean === 'payments') return { tab: 'payments' };
  if (clean === 'templates' || clean === 'settings') return { tab: 'templates' };
  return { tab: 'dashboard' };
}

export default function App() {
  const initialRoute = getTabFromPathname(window.location.pathname);
  const [currentTab, setCurrentTab] = useState<string>(initialRoute.tab);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Auth State
  const { user, signOut, isConfigured: isSupabaseConfigured } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(!!initialRoute.openAuth);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>((initialRoute.openAuth as 'login' | 'signup') || 'login');

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
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState<boolean>(false);
  const [missingTableCount, setMissingTableCount] = useState<number>(0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Synchronize Tab and URL
  const navigateToTab = useCallback((tabId: string) => {
    setCurrentTab(tabId);
    const targetPath = tabId === 'dashboard' ? '/' : `/${tabId}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
  }, []);

  // Listen for browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const route = getTabFromPathname(window.location.pathname);
      setCurrentTab(route.tab);
      if (route.openAuth) {
        setAuthMode(route.openAuth);
        setIsAuthModalOpen(true);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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

      setStats(statsData || DEFAULT_STATS);
      setQuotations(Array.isArray(quotesData) ? quotesData : []);
      setBookings(Array.isArray(bookingsData) ? bookingsData : []);
      setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
      setPayments(Array.isArray(paymentsData) ? paymentsData : []);
      setProducts(Array.isArray(productsData) ? productsData : []);
      setCustomers(Array.isArray(customersData) ? customersData : []);
      setDailySchedule(Array.isArray(scheduleData) ? scheduleData : []);
      if (templatesData) setTemplateSettings(templatesData);
      setMissingTableCount(getMissingTables().length);
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

  const handleOpenInvoicePreview = (invoiceOrNumber: Invoice | string) => {
    let inv: Invoice | undefined;
    if (typeof invoiceOrNumber === 'string') {
      inv = invoices.find((i) => i.invoice_number === invoiceOrNumber || i.id === invoiceOrNumber);
    } else {
      inv = invoiceOrNumber;
    }
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
          navigateToTab(tab);
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
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={() => exportScheduleToExcel(dailySchedule)}
              className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold transition cursor-pointer"
              title="Download full schedule as Excel spreadsheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>

            {missingTableCount > 0 && (
              <button
                onClick={() => setIsSchemaModalOpen(true)}
                className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-semibold transition cursor-pointer"
                title="Tables missing in Supabase schema. Click to view & copy SQL setup script"
              >
                <Database className="w-3.5 h-3.5 text-amber-600" />
                <span className="hidden sm:inline">DB Setup ({missingTableCount})</span>
                <span className="sm:hidden">DB ({missingTableCount})</span>
              </button>
            )}

            {/* Supabase Auth Staff Badge / Login Trigger */}
            {user ? (
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
                <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs uppercase" title={user.email || 'Staff'}>
                  {(user.email || 'S')[0]}
                </div>
                <div className="hidden md:block text-left">
                  <span className="block text-[11px] font-bold text-slate-800 truncate max-w-[100px]">
                    {user.user_metadata?.full_name || user.email?.split('@')[0]}
                  </span>
                  <span className="block text-[9px] text-emerald-600 font-semibold uppercase tracking-wider">
                    Staff Active
                  </span>
                </div>
                <button
                  onClick={() => signOut()}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAuthMode('login');
                  setIsAuthModalOpen(true);
                }}
                className="inline-flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
              >
                <LogIn className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Staff Login</span>
              </button>
            )}

            <button
              onClick={() => setIsQuotationModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
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
              onViewBooking={() => navigateToTab('bookings')}
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
                navigateToTab('bookings');
              }}
            />
          )}

          {currentTab === 'invoices' && (
            <InvoicesList
              invoices={invoices}
              onPreviewInvoice={handleOpenInvoicePreview}
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

      {/* Supabase Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authMode}
      />

      {/* Supabase Schema Setup Modal */}
      <SupabaseSchemaModal
        isOpen={isSchemaModalOpen}
        onClose={() => setIsSchemaModalOpen(false)}
      />
    </div>
  );
}
