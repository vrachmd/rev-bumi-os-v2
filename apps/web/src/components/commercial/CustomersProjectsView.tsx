// @ts-nocheck
import React, { useState } from 'react';
import {
  Building2,
  FolderKanban,
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Phone,
  Mail,
  User,
  Loader2,
  Crosshair,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { forwardGeocode } from '../../lib/geocode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const inputCls =
  'w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden';
const labelCls = 'text-xs font-semibold text-slate-700 block mb-1';

export const CustomersProjectsView: React.FC = () => {
  const { customers, projects, contracts, addCustomer, addProject, saveCustomer, saveProject, deleteCustomer, deleteProject } = useApp() as any;
  const [activeTab, setActiveTab] = useState<'customers' | 'projects'>('customers');

  // ---- Tambah Pelanggan ----
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [cName, setCName] = useState('');
  const [cNpwp, setCNpwp] = useState('');
  const [cAddress, setCAddress] = useState('');
  const [cPic, setCPic] = useState('');
  const [cPhone, setCPhone] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cTerms, setCTerms] = useState(30);
  const [cTax, setCTax] = useState(11);
  const [cTemplate, setCTemplate] = useState<'IMCI-AGREGAT' | 'STANDARD-PER-RIT' | ''>('');
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);

  // ---- Tambah Proyek ----
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [pName, setPName] = useState('');
  const [pCustomerId, setPCustomerId] = useState('');
  const [pLocation, setPLocation] = useState('');
  const [pLat, setPLat] = useState('');
  const [pLng, setPLng] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeMsg, setGeocodeMsg] = useState('');
  const [pStartDate, setPStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [pStatus, setPStatus] = useState<'ACTIVE' | 'ON_HOLD' | 'COMPLETED'>('ACTIVE');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  const openCustomerModal = () => {
    setEditingCustomerId(null);
    setCName('');
    setCNpwp('');
    setCAddress('');
    setCPic('');
    setCPhone('');
    setCEmail('');
    setCTerms(30);
    setCTax(11);
    setCTemplate('');
    setShowCustomerModal(true);
  };
  const openEditCustomer = (c: any) => {
    setEditingCustomerId(c.id);
    setCName(c.name); setCNpwp(c.npwp||''); setCAddress(c.billingAddress||c.address||'');
    setCPic(c.contactPerson||''); setCPhone(c.phone||''); setCEmail(c.email||'');
    setCTerms(c.paymentTermsDays||30); setCTax(c.taxRatePercent ?? 11); setCTemplate(c.invoiceTemplateId||'');
    setShowCustomerModal(true);
  };
  const handleDeleteCustomer = (id: string) => {
    if (!confirm('Hapus pelanggan ini? (gagal jika masih dipakai proyek/kontrak)')) return;
    const r: any = deleteCustomer(id);
    if (r && !r.success) alert(r.error || 'Gagal hapus');
  };

  const openProjectModal = () => {
    setEditingProjectId(null);
    setPName('');
    setPCustomerId(customers[0]?.id || '');
    setPLocation('');
    setPLat('');
    setPLng('');
    setGeocodeMsg('');
    setPStartDate(new Date().toISOString().slice(0, 10));
    setPStatus('ACTIVE');
    setShowProjectModal(true);
  };
  const openEditProject = (p: any) => {
    setEditingProjectId(p.id);
    setPName(p.name); setPCustomerId(p.customerId); setPLocation(p.location);
    setPLat(p.gpsLat?.toString()||''); setPLng(p.gpsLng?.toString()||'');
    setPStartDate(p.startDate?.slice(0,10)||new Date().toISOString().slice(0,10)); setPStatus(p.status as any);
    setShowProjectModal(true);
  };
  const handleDeleteProject = (id: string) => {
    if (!confirm('Hapus proyek ini? (gagal jika masih dipakai kontrak/pengiriman)')) return;
    const r: any = deleteProject(id);
    if (r && !r.success) alert(r.error || 'Gagal hapus');
  };

  const handleGeocode = async () => {
    if (!pLocation.trim()) {
      setGeocodeMsg('Isi alamat/lokasi proyek terlebih dahulu.');
      return;
    }
    setGeocoding(true);
    setGeocodeMsg('Mencari koordinat dari alamat...');
    const res = await forwardGeocode(pLocation);
    if (res) {
      setPLat(res.lat.toFixed(6));
      setPLng(res.lng.toFixed(6));
      setGeocodeMsg(`Ditemukan: ${res.displayName}`);
    } else {
      setGeocodeMsg('Lokasi tidak ditemukan. Isi koordinat manual (mis. dari Google Maps).');
    }
    setGeocoding(false);
  };

  const submitCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCustomerId) {
      const orig = customers.find((c:any)=>c.id===editingCustomerId);
      if (orig) saveCustomer({ ...orig, name: cName.trim(), npwp: cNpwp.trim(), billingAddress: cAddress.trim(), address: cAddress.trim(), contactPerson: cPic.trim(), phone: cPhone.trim(), email: cEmail.trim(), paymentTermsDays: Number(cTerms)||30, taxRatePercent: Number(cTax), invoiceTemplateId: cTemplate || undefined } as any);
    } else {
      addCustomer({ name: cName.trim(), npwp: cNpwp.trim(), billingAddress: cAddress.trim(), contactPerson: cPic.trim(), phone: cPhone.trim(), email: cEmail.trim(), paymentTermsDays: Number(cTerms) || 30, isActive: true, taxRatePercent: Number(cTax), invoiceTemplateId: cTemplate || undefined } as any);
    }
    setShowCustomerModal(false); setEditingCustomerId(null);
  };

  const submitProject = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = pLat ? Number(pLat) : undefined;
    const lng = pLng ? Number(pLng) : undefined;
    if (editingProjectId) {
      const orig = projects.find((p:any)=>p.id===editingProjectId);
      if (orig) saveProject({ ...orig, customerId: pCustomerId, name: pName.trim(), location: pLocation.trim(), gpsLat: lat, gpsLng: lng, startDate: pStartDate, status: pStatus } as any);
    } else {
      addProject({ customerId: pCustomerId, name: pName.trim(), location: pLocation.trim(), gpsLat: lat, gpsLng: lng, startDate: pStartDate, status: pStatus });
    }
    setShowProjectModal(false); setEditingProjectId(null);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Sub tabs — shadcn Tabs + Button */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1">
          <TabsList>
            <TabsTrigger value="customers" className="text-xs">Daftar Pelanggan / Kontraktor ({customers.length})</TabsTrigger>
            <TabsTrigger value="projects" className="text-xs">Daftar Proyek Konstruksi Site ({projects.length})</TabsTrigger>
          </TabsList>
        </Tabs>

        <Button size="sm" onClick={activeTab === 'customers' ? openCustomerModal : openProjectModal}>
          <Plus className="w-4 h-4" />
          {activeTab === 'customers' ? 'Tambah Pelanggan Baru' : 'Tambah Proyek / Site Baru'}
        </Button>
      </div>

      {activeTab === 'customers' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((cust) => {
            const custContracts = contracts.filter((c) => c.customerId === cust.id);
            const totalContracted = custContracts.reduce(
              (sum, c) => sum + (c.contractType === 'NON_PO' ? 0 : c.contractedVolumeM3),
              0
            );

            return (
              <div
                key={cust.id}
                className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded bg-slate-100 text-[#003C16]">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{cust.name}</h4>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Kode: {cust.code}
                      </span>
                      {(cust as any).invoiceTemplateId && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold ml-2">{(cust as any).invoiceTemplateId}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={()=>openEditCustomer(cust)} className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 text-slate-600" title="Edit pelanggan"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={()=>handleDeleteCustomer(cust.id)} className="p-1.5 rounded border border-rose-200 hover:bg-rose-50 text-rose-600" title="Hapus pelanggan"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>PIC: {cust.contactPerson}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{cust.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{cust.email}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="text-[11px] leading-tight">{cust.address}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500">Termin Pembayaran:</span>
                  <span className="font-bold text-slate-900">{cust.paymentTermsDays} Hari</span>
                </div>
                <div className="pt-1 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500">PPN Default:</span>
                  <span className="font-bold text-slate-900">{(cust as any).taxRatePercent ?? 11}%</span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500">Kontrak Aktif:</span>
                  <span className="font-bold text-emerald-800">
                    {custContracts.filter((c) => c.status === 'ACTIVE').length} ({totalContracted.toLocaleString('id-ID')} m³)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((proj) => {
            const cust = customers.find((c) => c.id === proj.customerId);
            const projContracts = contracts.filter((c) => c.projectId === proj.id);
            return (
              <div
                key={proj.id}
                className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded bg-emerald-50 text-emerald-800">
                      <FolderKanban className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{proj.name}</h4>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Kode: {proj.code || proj.projectNumber}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={()=>openEditProject(proj)} className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 text-slate-600" title="Edit proyek"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={()=>handleDeleteProject(proj.id)} className="p-1.5 rounded border border-rose-200 hover:bg-rose-50 text-rose-600" title="Hapus proyek"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Pelanggan:</span>
                    <span className="font-bold text-slate-900">{cust?.name}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="text-[11px] leading-tight">{proj.location}</span>
                  </div>
                  {proj.gpsLat !== undefined && proj.gpsLng !== undefined && (
                    <div className="text-[10px] text-slate-500 font-mono">
                      GPS: {proj.gpsLat.toFixed(5)}, {proj.gpsLng.toFixed(5)}
                    </div>
                  )}
                  <div className="text-[10px] text-slate-500 font-mono">
                    Kontrak: {projContracts.length} · Status: {proj.status}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showCustomerModal} onOpenChange={setShowCustomerModal}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
          <DialogHeader className="px-5 py-3.5 bg-primary text-primary-foreground rounded-t-lg shrink-0">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-200" />
              <DialogTitle className="text-sm font-bold uppercase tracking-wider text-primary-foreground">{editingCustomerId ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}</DialogTitle>
            </div>
          </DialogHeader>

            <form onSubmit={submitCustomer} className="p-5 space-y-3.5 max-h-[75vh] overflow-y-auto">
              <div>
                <label className={labelCls}>Nama Pelanggan / Kontraktor *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: PT Pramanda Utama Karya"
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>NPWP</label>
                <input
                  type="text"
                  placeholder="Contoh: 01.234.567.8-093.000"
                  value={cNpwp}
                  onChange={(e) => setCNpwp(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Alamat Penagihan</label>
                <input
                  type="text"
                  placeholder="Alamat kantor / penagihan"
                  value={cAddress}
                  onChange={(e) => setCAddress(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Contact Person (PIC)</label>
                <input
                  type="text"
                  placeholder="Nama & jabatan PIC"
                  value={cPic}
                  onChange={(e) => setCPic(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Telepon</label>
                  <input
                    type="text"
                    placeholder="+62 ..."
                    value={cPhone}
                    onChange={(e) => setCPhone(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <input
                    type="email"
                    placeholder="email@perusahaan.co.id"
                    value={cEmail}
                    onChange={(e) => setCEmail(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Termin Pembayaran (hari)</label>
                  <input
                    type="number"
                    min={0}
                    value={cTerms}
                    onChange={(e) => setCTerms(Number(e.target.value))}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>PPN Default (%)</label>
                  <select value={String(cTax)} onChange={(e) => setCTax(Number(e.target.value))} className={inputCls}>
                    <option value={0}>0% (Non-PPN)</option>
                    <option value={11}>11%</option>
                    <option value={12}>12% (2025)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Template Faktur</label>
                <select value={cTemplate} onChange={(e)=>setCTemplate(e.target.value as any)} className={inputCls}>
                  <option value="">Auto (IMCI → Agregat)</option>
                  <option value="IMCI-AGREGAT">IMCI Agregat (tgl plat IMCI vol KBS)</option>
                  <option value="STANDARD-PER-RIT">Standard Per-Rit (No|SJ|Approved)</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">Kosong = auto: IMCI → agregat, lainnya → standar</p>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(false)}
                  className="flex-1 px-3 py-2 rounded-md border border-slate-300 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-3 py-2 rounded-md bg-[#003C16] hover:bg-[#002B10] text-white text-xs font-bold transition-colors"
                >
                  Simpan Pelanggan
                </button>
              </div>
            </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showProjectModal} onOpenChange={setShowProjectModal}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
          <DialogHeader className="px-5 py-3.5 bg-primary text-primary-foreground rounded-t-lg shrink-0">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-emerald-200" />
              <DialogTitle className="text-sm font-bold uppercase tracking-wider text-primary-foreground">{editingProjectId ? 'Edit Proyek / Site' : 'Tambah Proyek / Site Baru'}</DialogTitle>
            </div>
          </DialogHeader>

            <form onSubmit={submitProject} className="p-5 space-y-3.5 max-h-[75vh] overflow-y-auto">
              <div>
                <label className={labelCls}>Nama Proyek / Site *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Myza, Pagedangan, BSD City"
                  value={pName}
                  onChange={(e) => setPName(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Pelanggan (Customer) *</label>
                <select
                  value={pCustomerId}
                  onChange={(e) => setPCustomerId(e.target.value)}
                  className={inputCls}
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Lokasi / Alamat Proyek *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Jl. Myza Raya, Pagedangan, Tangerang"
                  value={pLocation}
                  onChange={(e) => setPLocation(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Koordinat Site (untuk ETA armada)</span>
                  <button
                    type="button"
                    onClick={handleGeocode}
                    disabled={geocoding}
                    className="px-3 py-1.5 rounded-md bg-[#003C16] hover:bg-[#002B10] text-white text-[11px] font-bold flex items-center gap-1.5 transition-colors disabled:opacity-60"
                  >
                    {geocoding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5" />}
                    Cari Koordinat
                  </button>
                </div>
                {geocodeMsg && (
                  <p className="text-[11px] text-slate-600 leading-tight">{geocodeMsg}</p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="-6.336000"
                      value={pLat}
                      onChange={(e) => setPLat(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="106.630000"
                      value={pLng}
                      onChange={(e) => setPLng(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400">
                  Tip: koordinat bisa diedit manual. Untuk lokasi dalam kawasan, gunakan koordinat gerbang utama.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Mulai Proyek</label>
                  <input
                    type="date"
                    value={pStartDate}
                    onChange={(e) => setPStartDate(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Status Site</label>
                  <select
                    value={pStatus}
                    onChange={(e) => setPStatus(e.target.value as 'ACTIVE' | 'ON_HOLD' | 'COMPLETED')}
                    className={inputCls}
                  >
                    <option value="ACTIVE">Aktif</option>
                    <option value="ON_HOLD">Ditunda</option>
                    <option value="COMPLETED">Selesai</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowProjectModal(false)}
                  className="flex-1 px-3 py-2 rounded-md border border-slate-300 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-3 py-2 rounded-md bg-[#003C16] hover:bg-[#002B10] text-white text-xs font-bold transition-colors"
                >
                  Simpan Proyek
                </button>
              </div>
            </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};