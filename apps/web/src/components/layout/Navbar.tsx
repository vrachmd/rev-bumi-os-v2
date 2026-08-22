import React from 'react';
import { Menu, UserCheck, Plus, LogOut, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Role } from '../../types';
import { NavTab } from './Sidebar';
import { Button } from '@/components/ui/button';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
    <header className="sticky top-0 z-30 bg-card border-b border-border shadow-xs">
      <div className="px-4 lg:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Breadcrumb + Title */}
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" onClick={onOpenMobileMenu} className="lg:hidden -ml-2 shrink-0">
            <Menu className="w-5 h-5" />
            <span className="sr-only">Buka menu</span>
          </Button>

          <div className="min-w-0">
            <Breadcrumb className="hidden sm:flex mb-0.5">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="#" className="text-[11px]">REV Bumi OS</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-[11px] font-medium truncate max-w-[260px]">{currentTabMeta.title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <h1 className="text-base lg:text-lg font-bold text-foreground truncate tracking-tight leading-none">
              {currentTabMeta.title}
            </h1>
            <p className="hidden sm:block text-xs text-muted-foreground truncate">
              {currentTabMeta.subtitle}
            </p>
          </div>
        </div>

        {/* Right: Actions & Role Simulator */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenNewDelivery && (
            <Button size="sm" onClick={onOpenNewDelivery} className="bg-primary hover:bg-primary/90 shadow-xs">
              <Plus className="w-4 h-4" />
              <span className="hidden md:inline">Buat Surat Jalan</span>
              <span className="md:hidden">Kirim</span>
            </Button>
          )}

          {isSupabaseAuthed ? (
            <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-md px-2.5 py-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-300" />
              <span className="text-[11px] font-medium text-muted-foreground hidden xl:inline">
                {displayProfile.fullName} · {displayProfile.role}
              </span>
              <span className="text-[11px] font-medium xl:hidden">{displayProfile.role}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-muted border border-border rounded-md px-2 py-1">
              <UserCheck className="w-3.5 h-3.5 text-primary hidden sm:block" />
              <span className="text-[11px] font-medium text-muted-foreground hidden xl:inline">Role:</span>
              <Select value={currentProfile.role} onValueChange={(v) => setCurrentRole(v as Role)}>
                <SelectTrigger size="sm" className="h-7 text-xs font-semibold border-0 bg-transparent shadow-none gap-1.5 px-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.id} value={r.id} className="text-xs">
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isSupabaseAuthed && (
            <Button variant="ghost" size="icon" onClick={logoutFromSupabase} title="Keluar dari Supabase" className="text-muted-foreground hover:text-destructive">
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
