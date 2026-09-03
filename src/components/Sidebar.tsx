import React from 'react';
import {
  LayoutDashboard,
  FileText,
  CalendarCheck,
  Calendar,
  Layers,
  FileSpreadsheet,
  FileCheck2,
  CreditCard,
  Package,
  Users,
  Sliders,
  Plus,
  Sparkles,
  Database,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenQuotationBuilder: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onOpenQuotationBuilder,
  isOpenMobile,
  onCloseMobile,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'quotations', label: 'Quotations', icon: FileText },
    { id: 'bookings', label: 'Confirmed Bookings', icon: CalendarCheck },
    { id: 'availability', label: 'Equipment Availability', icon: Calendar },
    { id: 'schedule', label: 'Daily Schedule & Excel', icon: FileSpreadsheet },
    { id: 'invoices', label: 'Official Invoices', icon: FileCheck2 },
    { id: 'payments', label: 'Payment Records', icon: CreditCard },
    { id: 'products', label: 'Equipment Inventory', icon: Package },
    { id: 'customers', label: 'Customer Directory', icon: Users },
    { id: 'templates', label: 'Template Customizer', icon: Sliders },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-xs"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col justify-between transition-transform duration-200 ease-in-out border-r border-slate-800 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center font-black text-white text-lg shadow-md">
                KJ
              </div>
              <div>
                <h1 className="font-black text-base tracking-tight text-white leading-tight">
                  Kids Jump 4 Joy
                </h1>
                <p className="text-[11px] text-slate-400 font-medium">Event & Inventory ERP</p>
              </div>
            </div>

            {/* Quick Action Button */}
            <button
              onClick={() => {
                onOpenQuotationBuilder();
                onCloseMobile();
              }}
              className="w-full mt-5 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>+ New Quotation</span>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-250px)]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Database & System Info Footer */}
        <div className="p-4 border-t border-slate-800 text-[11px] text-slate-400 space-y-1.5">
          <div className="flex items-center space-x-2 text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Supabase / Node.js Synced</span>
          </div>
          <p className="text-[10px] text-slate-500">
            Kids Jump 4 Joy ERP v2.4 (Production Ready)
          </p>
        </div>
      </aside>
    </>
  );
};
