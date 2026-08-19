import React from 'react';
import {
  LayoutDashboard,
  Truck,
  Scale,
  FileCheck2,
  GitCompare,
  FileText,
  Building2,
  FolderKanban,
  FileBadge,
  DollarSign,
  TrendingUp,
  CreditCard,
  Layers,
  Mountain,
  FileSpreadsheet,
  ShieldCheck,
  History,
  X,
} from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { useApp } from '../../context/AppContext';

export type NavTab =
  | 'dashboard'
  | 'field-handover'
  | 'deliveries'
  | 'reconciliation'
  | 'contracts'
  | 'customers-projects'
  | 'logistics'
  | 'hpp-finance'
  | 'invoices'
  | 'payments'
  | 'master-data'
  | 'reports'
  | 'audit-admin'
  | 'data-sync';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen,
  onClose,
}) => {
  const { currentProfile, deliveries, invoices, contracts } = useApp();

  // Exception badges
  const aboveToleranceCount = deliveries.filter(
    (d) => d.reconciliation?.varianceStatus === 'ABOVE_TOLERANCE'
  ).length;

  const pendingPodCount = deliveries.filter(
    (d) => d.status === 'POD_SUBMITTED' && !d.pod?.verifiedAt
  ).length;

  const overdueInvoicesCount = invoices.filter((i) => i.status === 'OVERDUE').length;

  const navItems: {
    category: string;
    items: {
      id: NavTab;
      label: string;
      icon: React.ElementType;
      badge?: number;
      badgeVariant?: 'danger' | 'warning' | 'info';
    }[];
  }[] = [
    {
      category: 'UTAMA',
      items: [
        { id: 'dashboard', label: 'Operational Cockpit', icon: LayoutDashboard },
      ],
    },
    {
      category: 'OPERASI & LAPANGAN',
      items: [
        {
          id: 'field-handover',
          label: 'Kontrol Quarry & Site',
          icon: Scale,
          badge: deliveries.filter((d) => d.status === 'IN_TRANSIT' || d.status === 'LOADING').length || undefined,
          badgeVariant: 'info',
        },
        {
          id: 'deliveries',
          label: 'Pengiriman & Surat Jalan',
          icon: Truck,
          badge: pendingPodCount > 0 ? pendingPodCount : undefined,
          badgeVariant: 'info',
        },
        {
          id: 'reconciliation',
          label: 'Rekonsiliasi Volume m³',
          icon: GitCompare,
          badge: aboveToleranceCount > 0 ? aboveToleranceCount : undefined,
          badgeVariant: 'warning',
        },
      ],
    },
    {
      category: 'KOMERSIAL & KONTRAK',
      items: [
        { id: 'contracts', label: 'Kontrak & Fulfillment', icon: FileBadge },
        { id: 'customers-projects', label: 'Customer & Proyek', icon: Building2 },
      ],
    },
    {
      category: 'LOGISTIK & ARMADA',
      items: [
        { id: 'logistics', label: 'Vendor & Tarif Angkut', icon: Scale },
      ],
    },
    {
      category: 'KEUANGAN & HPP',
      items: [
        { id: 'hpp-finance', label: 'HPP & Laba Kotor', icon: TrendingUp },
        {
          id: 'invoices',
          label: 'Faktur / Invoices',
          icon: FileText,
          badge: overdueInvoicesCount > 0 ? overdueInvoicesCount : undefined,
          badgeVariant: 'danger',
        },
        { id: 'payments', label: 'Pembayaran & Piutang', icon: CreditCard },
      ],
    },
    {
      category: 'MASTER DATA',
      items: [
        { id: 'master-data', label: 'Produk & Quarry', icon: Mountain },
      ],
    },
    {
      category: 'ANALITIK & AUDIT',
      items: [
        { id: 'reports', label: 'Laporan & Ekspor CSV', icon: FileSpreadsheet },
        { id: 'audit-admin', label: 'Audit Trail & Koreksi', icon: History },
      ],
    },
    {
      category: 'SISTEM',
      items: [
        { id: 'data-sync', label: 'Sinkronisasi Supabase', icon: GitCompare },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#002B10] text-slate-200 flex flex-col border-r border-[#003C16] transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-[#003C16]/80 bg-[#00240D]">
          <BrandLogo />
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navItems.map((group) => (
            <div key={group.category} className="space-y-1">
              <div className="px-3 text-[10px] font-bold uppercase tracking-widest text-emerald-400/60 mb-1.5">
                {group.category}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      onClose();
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#0B5A2A] text-white shadow-xs font-semibold'
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-emerald-300' : 'text-slate-400'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>

                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                          item.badgeVariant === 'danger'
                            ? 'bg-rose-500 text-white'
                            : item.badgeVariant === 'warning'
                            ? 'bg-amber-500 text-slate-900'
                            : 'bg-emerald-500 text-white'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Identity / Role Footer */}
        <div className="p-3 border-t border-[#003C16] bg-[#00240D]">
          <div className="flex items-center gap-2.5 p-2 rounded-md bg-white/5">
            <div className="w-8 h-8 rounded-full bg-[#003C16] border border-emerald-500/30 flex items-center justify-center font-bold text-xs text-emerald-200">
              {currentProfile.fullName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {currentProfile.fullName}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span className="text-[10px] text-emerald-300/80 font-medium">
                  {currentProfile.role}
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
