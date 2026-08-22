import React from 'react';
import { Menu, UserCheck, Plus, LogOut, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Role } from '../../types';
import { NavTab } from './Sidebar';

interface NavbarProps {
  activeTab: NavTab;
  onOpenMobileMenu: () => void;
  onOpenNewDelivery?: () => void;
}

const TAB_TITLES: Record<NavTab, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Operational & Commercial Cockpit',
    subtitle: 'PT REV Bumi Nusantara Perkasa — Status Operasional & Ringkasan Bisnis',
  },
  'field-handover': {
    title: 'Kontrol Lapangan Terintegrasi (Quarry & Site)',
    subtitle: 'Alur Berkesinambungan: Pengukuran Loading di Quarry ⟷ Verifikasi Kubikasi Unloading di Site Proyek',
  },
  deliveries: {
    title: 'Log Pengiriman & Surat Jalan',
    subtitle: 'Manajemen Pengangkutan, Loading Quarry, Timbangan, dan POD',
  },
  reconciliation: {
    title: 'Quantity Reconciliation Engine',
    subtitle: 'Pemeriksaan Selisih Volume (m³), Toleransi Kontrak, dan Penyesuaian Komersial',
  },
  contracts: {
    title: 'Kontrak Proyek & Realisasi',
    subtitle: 'Pemantauan Volume Kontrak (m³), Realisasi Approved, dan Burn Rate',
  },
  'customers-projects': {
    title: 'Direktori Pelanggan & Proyek Konstruksi',
    subtitle: 'Daftar Kontraktor BUMN / Swasta dan Lokasi Site Proyek',
  },
  logistics: {
    title: 'Armada & Tarif Vendor Transportasi',
    subtitle: 'Manajemen Truk Tronton, Supir Eksternal, dan Matrix Tarif Angkut',
  },
  'hpp-finance': {
    title: 'Analisis HPP & Margin Laba Kotor',
    subtitle: 'Kalkulasi HPP = Biaya Material + Ongkos Angkut + Biaya Operasional',
  },
  invoices: {
    title: 'Penagihan & Faktur Proyek (Invoices)',
    subtitle: 'Penerbitan Invoice Berdasarkan Approved Volume (m³)',
  },
  payments: {
    title: 'Penerimaan Pembayaran & Aging Piutang (AR)',
    subtitle: 'Pencatatan Rekening Koran, Pembayaran Parsial, dan Saldo Terbuka',
  },
  'master-data': {
    title: 'Master Data Material & Quarry',
    subtitle: 'Spesifikasi Batu Split, Base Course, Pasir, Densitas (ton/m³) & Rating Abrasi',
  },
  reports: {
    title: 'Laporan Komprehensif & Ekspor CSV',
    subtitle: 'Unduh Rekapitulasi Pengiriman, Volume, Kontrak, dan Keuangan dengan Satuan Baku',
  },
  'audit-admin': {
    title: 'Audit Trail & Workflow Koreksi',
    subtitle: 'Riwayat Perubahan Tidak Terhapuskan & Pengajuan Koreksi Resmi',
  },
};

const ROLES: { id: Role; label: string }[] = [
  { id: 'MANAGEMENT', label: 'Direksi / Management' },
  { id: 'OPERATIONS', label: 'Divisi Operasi & QS' },
  { id: 'QUARRY_CHECKER', label: '⛰️ Petugas Lapangan Quarry (Loading)' },
  { id: 'SITE_CHECKER', label: '🏗️ Petugas Lapangan Site (Unloading)' },
  { id: 'COMMERCIAL', label: 'Pemasaran & Kontrak' },
  { id: 'FINANCE', label: 'Keuangan & Akuntansi' },
  { id: 'DISPATCHER', label: 'Quarry Dispatcher' },
  { id: 'SUPER_ADMIN', label: 'Super Administrator' },
  { id: 'VIEWER', label: 'Auditor / Viewer' },
];

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onOpenMobileMenu,
  onOpenNewDelivery,
}) => {
  const { currentProfile, setCurrentRole, isSupabaseAuthed, supabaseProfile, logoutFromSupabase } = useApp();
  const currentTabMeta = TAB_TITLES[activeTab] || {
    title: 'REV Bumi OS',
    subtitle: 'Business Operating System',
  };
  const displayProfile = supabaseProfile ?? currentProfile;

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-2xs">
      <div className="px-4 lg:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Page Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 -ml-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <h1 className="text-base lg:text-lg font-bold text-slate-900 truncate tracking-tight">
              {currentTabMeta.title}
            </h1>
            <p className="hidden sm:block text-xs text-slate-500 truncate">
              {currentTabMeta.subtitle}
            </p>
          </div>
        </div>

        {/* Right: Actions & Role Simulator */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Quick Action Button */}
          {onOpenNewDelivery && (
            <button
              onClick={onOpenNewDelivery}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-[#003C16] hover:bg-[#002B10] transition-colors shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden md:inline">Buat Surat Jalan</span>
              <span className="md:hidden">Kirim</span>
            </button>
          )}

          {/* Role Switcher for RBAC Simulation */}
          {isSupabaseAuthed ? (
            <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-md px-2.5 py-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span className="text-[11px] font-medium text-slate-600 hidden xl:inline">
                {displayProfile.fullName} · {displayProfile.role}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1">
              <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span className="text-[11px] font-medium text-slate-600 hidden xl:inline">
                Role:
              </span>
              <select
                value={currentProfile.role}
                onChange={(e) => setCurrentRole(e.target.value as Role)}
                className="text-xs font-semibold text-[#003C16] bg-transparent border-0 focus:ring-0 cursor-pointer outline-hidden py-0.5"
              >
                {ROLES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {isSupabaseAuthed && (
            <button
              onClick={logoutFromSupabase}
              title="Keluar dari Supabase"
              className="p-1.5 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
