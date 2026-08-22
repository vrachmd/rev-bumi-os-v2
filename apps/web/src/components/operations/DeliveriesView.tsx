import React, { useState } from 'react';
import {
  Truck,
  Plus,
  Printer,
  Scale,
  FileCheck2,
  GitCompare,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Clock,
  Layers,
  FileSpreadsheet,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
class BulkErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  state = { hasError: false, error: null as any };
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  render() { if ((this.state as any).hasError) return <div className="p-6 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded">Bulk gagal load: {String((this.state as any).error?.message || (this.state as any).error)} — halaman Pengiriman tetap aman. Coba reload atau hubungi admin.</div>; return this.props.children; }
}
import { useApp } from '../../context/AppContext';
import { Delivery, DeliveryStatus, TransportVendor, Vehicle } from '../../types';
import { formatDate, formatDateTime, formatIDR, formatVolumeM3, formatWeightKg } from '../../lib/formatters';
import { resolveFreightRate } from '../../lib/freightRate';
import { SuratJalanPrintModal } from './SuratJalanPrintModal';
import { WeighbridgeModal } from './WeighbridgeModal';
import { PodModal } from './PodModal';
// bulk isolasi sementara — lazy + error boundary untuk cegah vendor ReferenceError jatuhkan halaman
import dynamic from 'next/dynamic';
const BulkDeliveriesView = dynamic(() => import('./BulkDeliveriesView').then(m => m.BulkDeliveriesView).catch(() => ({ default: () => null } as any)), { ssr: false, loading: () => <div className="p-8 text-center text-xs text-slate-500">Memuat bulk...</div> });

interface DeliveriesViewProps {
  onNavigateToReconcile?: () => void;
}

export const DeliveriesView: React.FC<DeliveriesViewProps> = ({ onNavigateToReconcile }) => {
  const {
    deliveries,
    products,
    contracts,
    quarries,
    customers,
    projects,
    transportVendors,
    vehicles,
    drivers,
    freightRates,
    addDelivery,
    updateDelivery,
    updateDeliveryStatus,
    verifyPod,
    saveVendor,
    saveVehicle,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedDeliveryForPrint, setSelectedDeliveryForPrint] = useState<Delivery | null>(null);
  const [selectedDeliveryForWb, setSelectedDeliveryForWb] = useState<Delivery | null>(null);
  const [selectedDeliveryForPod, setSelectedDeliveryForPod] = useState<Delivery | null>(null);
  const [selectedDetailDelivery, setSelectedDetailDelivery] = useState<Delivery | null>(null);
  const [imciInput, setImciInput] = useState('');
  const [showBulk, setShowBulk] = useState(false);

  // New Delivery Modal state
  const [isCreatingDelivery, setIsCreatingDelivery] = useState(false);
  const [newContractId, setNewContractId] = useState(contracts[0]?.id || '');
  const [newQuarryId, setNewQuarryId] = useState(quarries[0]?.id || '');
  const [newVendorId, setNewVendorId] = useState(transportVendors[0]?.id || '');
  const [newVehicleId, setNewVehicleId] = useState(vehicles[0]?.id || '');
  const [newDriverId, setNewDriverId] = useState(drivers[0]?.id || '');
  const [newLoadedVolume, setNewLoadedVolume] = useState<number>(24.0);
  const [newScheduleDate, setNewScheduleDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [createError, setCreateError] = useState<string | null>(null);

  // Inline add vendor / vehicle (vendor perorangan di lapangan)
  const [showNewVendorForm, setShowNewVendorForm] = useState(false);
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorPhone, setNewVendorPhone] = useState('');
  const [newVendorSupplyType, setNewVendorSupplyType] = useState<'TRANSPORT_ONLY' | 'MATERIAL_AND_TRANSPORT'>('TRANSPORT_ONLY');
  const [showNewVehicleForm, setShowNewVehicleForm] = useState(false);
  const [newVehiclePlate, setNewVehiclePlate] = useState('');
  const [newVehicleCapacity, setNewVehicleCapacity] = useState(24);
  const [addError, setAddError] = useState<string | null>(null);

  const filteredVehicles = vehicles.filter((v) => v.transportVendorId === newVendorId);

  const selectedContract = contracts.find((c) => c.id === newContractId);

  // Quarry yang boleh dipilih: batasi ke sourceQuarryIds kontrak bila tersedia (multi-source fleksibel).
  const allowedQuarries =
    selectedContract?.sourceQuarryIds && selectedContract.sourceQuarryIds.length > 0
      ? quarries.filter((q) => selectedContract.sourceQuarryIds!.includes(q.id))
      : quarries;

  // Vendor yang punya tarif aktif untuk rute (quarry + project) terpilih.
  const eligibleVendorIds = freightRates
    .filter(
      (r) =>
        r.isActive !== false &&
        r.projectId === selectedContract?.projectId &&
        r.quarryId === newQuarryId
    )
    .map((r) => r.transportVendorId);
  const eligibleVendors = transportVendors.filter((v) => eligibleVendorIds.includes(v.id));

  // Tarif yang sedang berlaku untuk kombinasi terpilih (efektif pada tanggal jadwal).
  const resolvedRate = selectedContract
    ? resolveFreightRate(freightRates, {
        transportVendorId: newVendorId,
        projectId: selectedContract.projectId,
        quarryId: newQuarryId,
        onDate: newScheduleDate,
      })
    : undefined;

  // Safe getters for optional fee fields
  const toll = resolvedRate?.tollFee ?? 0;
  const loading = resolvedRate?.loadingFee ?? 0;
  const unloading = resolvedRate?.unloadingFee ?? 0;
  const hasExtraFees = toll > 0 || loading > 0 || unloading > 0;

  const handleVendorSelect = (vendorId: string) => {
    setNewVendorId(vendorId);
    const stillBelongs = vehicles.some((v) => v.id === newVehicleId && v.transportVendorId === vendorId);
    if (!stillBelongs) setNewVehicleId('');
  };

  const handleSaveNewVendor = () => {
    setAddError(null);
    const name = newVendorName.trim();
    if (!name) {
      setAddError('Nama vendor wajib diisi.');
      return;
    }
    const vendor: TransportVendor = {
      id: `vendor-${Date.now()}`,
      name,
      contactPerson: 'Petugas Lapangan',
      phone: newVendorPhone.trim(),
      defaultPricingModel: newVendorSupplyType === 'MATERIAL_AND_TRANSPORT' ? 'ALL_IN' : 'PER_TRIP',
      supplyType: newVendorSupplyType,
      isActive: true,
    };
    saveVendor(vendor);
    setNewVendorId(vendor.id);
    setNewVehicleId('');
    setShowNewVendorForm(false);
    setNewVendorName('');
    setNewVendorPhone('');
    setNewVendorSupplyType('TRANSPORT_ONLY');
  };

  const handleSaveNewVehicle = () => {
    setAddError(null);
    const plate = newVehiclePlate.trim();
    if (!plate) {
      setAddError('Nomor polisi armada wajib diisi.');
      return;
    }
    if (!newVendorId) {
      setAddError('Pilih atau tambah vendor terlebih dahulu.');
      return;
    }
    const vehicle: Vehicle = {
      id: `veh-${Date.now()}`,
      transportVendorId: newVendorId,
      plateNumber: plate,
      vehicleType: `Dump Truck (${newVehicleCapacity} m³)`,
      nominalCapacityM3: newVehicleCapacity,
      isActive: true,
    };
    saveVehicle(vehicle);
    setNewVehicleId(vehicle.id);
    setShowNewVehicleForm(false);
    setNewVehiclePlate('');
    setNewVehicleCapacity(24);
  };

  const filteredDeliveries = deliveries.filter((d) => {
    const product = products.find((p) => p.id === d.productId);
    const contract = contracts.find((c) => c.id === d.contractId);
    const matchesSearch =
      d.deliveryNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract?.contractNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const contract = contracts.find((c) => c.id === newContractId);
    if (!contract) {
      setCreateError('Pilih kontrak yang valid.');
      return;
    }
    if (!eligibleVendorIds.includes(newVendorId)) {
      setCreateError('Vendor belum punya tarif aktif untuk rute quarry ini. Atur tarif di Modul Logistik.');
      return;
    }

    const res = addDelivery({
      contractId: newContractId,
      productId: contract.productId,
      quarryId: newQuarryId,
      transportVendorId: newVendorId,
      vehicleId: newVehicleId,
      driverId: newDriverId,
      loadedVolumeM3: Number(newLoadedVolume),
      scheduledDate: newScheduleDate,
    });

    if (res.success) {
      setIsCreatingDelivery(false);
      setCreateError(null);
    } else {
      setCreateError(res.error || 'Gagal membuat pengiriman.');
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Filter and Action Bar — shadcn Card + Input/Select/Button */}
      <Card className="py-4">
        <CardContent className="flex flex-col md:flex-row items-center justify-between gap-3 p-0 px-4">
          <div className="flex flex-1 items-center gap-2.5 w-full md:w-auto">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Cari No Surat Jalan, Kontrak, atau Material..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-8 text-xs"
              />
            </div>

            <div className="flex items-center gap-1 text-xs">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger size="sm" className="h-8 text-xs font-medium min-w-[170px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Status ({deliveries.length})</SelectItem>
                  <SelectItem value="PLANNED">PLANNED</SelectItem>
                  <SelectItem value="LOADING">LOADING</SelectItem>
                  <SelectItem value="IN_TRANSIT">IN_TRANSIT</SelectItem>
                  <SelectItem value="UNLOADED">UNLOADED</SelectItem>
                  <SelectItem value="POD_SUBMITTED">POD_SUBMITTED</SelectItem>
                  <SelectItem value="DELIVERED">DELIVERED</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBulk(true)}
              title="Import CSV/XLSX 10–50 ritase sekaligus"
              className="flex-1 md:flex-none"
            >
              <FileSpreadsheet className="w-4 h-4" /> Ritase Massal (Bulk)
            </Button>
            <Button
              size="sm"
              onClick={() => setIsCreatingDelivery(true)}
              className="flex-1 md:flex-none bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" /> Terbitkan Pengiriman Baru
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Table — shadcn Table + Card + Badge */}
      <Card className="overflow-hidden py-0 gap-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold">No. Surat Jalan</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Status</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Pelanggan / Proyek</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold whitespace-nowrap min-w-[130px]">Plat Nomor</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-right">Loaded (m³)</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-right">Received (m³)</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-right">Approved (m³)</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-right">Timbangan Net</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold">Vendor Armada</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-semibold text-center">AKSI & Dokumen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDeliveries.map((d) => {
                const product = products.find((p) => p.id === d.productId);
                const contract = contracts.find((c) => c.id === d.contractId);
                const customer = customers.find((c) => c.id === contract?.customerId);
                const project = projects.find((p) => p.id === contract?.projectId);
                const quarry = quarries.find((q) => q.id === d.quarryId);
                const vendor = transportVendors.find((v) => v.id === d.transportVendorId);
                const vehicle = vehicles.find((v) => v.id === d.vehicleId);
                const wb = d.weighbridge;
                const rec = d.reconciliation;

                return (
                  <TableRow key={d.id} className="hover:bg-muted/50 text-xs">
                    {/* Delivery Number & Date */}
                    <TableCell>
                      <button
                        onClick={() => setSelectedDetailDelivery(d)}
                        className="text-left hover:text-primary transition-colors group"
                        title="Lihat detail surat jalan"
                      >
                        <p className="font-bold text-foreground font-mono text-[13px] group-hover:text-primary group-hover:underline">
                          {d.deliveryNumber}
                        </p>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDate(d.scheduledDate)}
                        </span>
                      </button>
                    </TableCell>

                    {/* Status Badge — shadcn Badge */}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold border ${
                          d.status === 'DELIVERED'
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-100'
                            : d.status === 'POD_SUBMITTED'
                            ? 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-900/30 dark:text-blue-100'
                            : d.status === 'IN_TRANSIT'
                            ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/30 dark:text-amber-100'
                            : d.status === 'LOADING'
                            ? 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-900/30 dark:text-purple-100'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {d.status}
                      </Badge>
                    </TableCell>

                    {/* Customer & Project */}
                    <TableCell>
                      <p className="font-semibold text-foreground truncate max-w-[170px]">
                        {customer?.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate max-w-[170px]">
                        {project?.name}
                      </p>
                    </TableCell>

                    {/* Plat Nomor */}
                    <TableCell className="font-mono font-semibold whitespace-nowrap">
                      {vehicle?.plateNumber || d.driverName || '-'}
                    </TableCell>

                    {/* Loaded Volume */}
                    <TableCell className="text-right font-mono font-semibold">
                      {formatVolumeM3(d.loadedVolumeM3, false)}
                    </TableCell>

                    {/* Received Volume */}
                    <TableCell className="text-right font-mono">
                      {d.receivedVolumeM3 > 0
                        ? formatVolumeM3(d.receivedVolumeM3, false)
                        : '-'}
                    </TableCell>

                    {/* Approved Volume */}
                    <TableCell className="text-right font-mono font-bold text-primary">
                      {d.approvedVolumeM3 > 0
                        ? formatVolumeM3(d.approvedVolumeM3, false)
                        : '-'}
                    </TableCell>

                    {/* Weighbridge Net */}
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {wb ? formatWeightKg(wb.netWeightKg) : '-'}
                    </TableCell>

                    {/* Vendor Armada */}
                    <TableCell>
                      <p className="font-medium truncate max-w-[140px]">{vendor?.name || '-'}</p>
                      <p className="text-[10px] text-muted-foreground">{vehicle ? `${vehicle.nominalCapacityM3} m³` : ''}</p>
                    </TableCell>

                    {/* Action buttons — shadcn Button icon */}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="outline"
                          size="icon-xs"
                          onClick={() => setSelectedDetailDelivery(d)}
                          title="Lihat detail Surat Jalan"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon-xs"
                          onClick={() => setSelectedDeliveryForPrint(d)}
                          title="Cetak Surat Jalan Resmi"
                          className="hover:bg-primary hover:text-primary-foreground"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon-xs"
                          onClick={() => setSelectedDeliveryForWb(d)}
                          title="Catat Timbangan Quarry"
                          className={wb ? 'text-emerald-700 border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20' : ''}
                        >
                          <Scale className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon-xs"
                          onClick={() => setSelectedDeliveryForPod(d)}
                          title="Isi / Periksa POD Lapangan"
                          className={d.pod ? 'text-blue-700 border-blue-300 bg-blue-50 dark:bg-blue-900/20' : ''}
                        >
                          <FileCheck2 className="w-3.5 h-3.5" />
                        </Button>

                        {/* Status Progression Shortcut */}
                        {d.status === 'PLANNED' && (
                          <Button size="xs" onClick={() => updateDeliveryStatus(d.id, 'LOADING')} className="text-[10px] h-6">
                            Mulai Loading
                          </Button>
                        )}
                        {d.status === 'LOADING' && (
                          <Button size="xs" onClick={() => updateDeliveryStatus(d.id, 'IN_TRANSIT')} className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] h-6">
                            Kirim Truk
                          </Button>
                        )}
                        {d.status === 'IN_TRANSIT' && (
                          <Button size="xs" onClick={() => updateDeliveryStatus(d.id, 'ARRIVED')} className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] h-6">
                            Tiba di Site
                          </Button>
                        )}
                        {d.status === 'ARRIVED' && (
                          <Button size="xs" onClick={() => updateDeliveryStatus(d.id, 'UNLOADED')} className="bg-purple-600 hover:bg-purple-700 text-white text-[10px] h-6">
                            Unload
                          </Button>
                        )}
                        {d.status === 'POD_SUBMITTED' && !d.pod?.verifiedAt && (
                          <Button size="xs" onClick={() => verifyPod(d.id)} className="bg-emerald-600 hover:bg-emerald-500 text-[10px] h-6">
                            Verifikasi POD
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal: New Delivery Dispatch Order */}
      {isCreatingDelivery && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-3.5 bg-[#003C16] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-300" />
                <h2 className="text-sm font-bold uppercase tracking-wider">
                  Penerbitan Surat Jalan / Dispatch Pengiriman
                </h2>
              </div>
              <button
                onClick={() => setIsCreatingDelivery(false)}
                className="p-1 rounded text-white/80 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4">
              {createError && (
                <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  {createError}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Pilih Kontrak Proyek *
                </label>
                <select
                  value={newContractId}
                  onChange={(e) => {
                    setNewContractId(e.target.value);
                    const next = contracts.find((c) => c.id === e.target.value);
                    const primary =
                      next?.sourceQuarryIds && next.sourceQuarryIds.length > 0
                        ? next.sourceQuarryIds[0]
                        : next?.quarryId || '';
                    if (primary && quarries.some((q) => q.id === primary)) {
                      setNewQuarryId(primary);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden font-medium"
                >
                  {contracts.map((c) => {
                    const cust = customers.find((cu) => cu.id === c.customerId);
                    const prod = products.find((pr) => pr.id === c.productId);
                    return (
                      <option key={c.id} value={c.id}>
                        {c.contractNumber} — {cust?.name} ({prod?.name})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Quarry Asal Muatan *
                  </label>
                  <select
                    value={newQuarryId}
                    onChange={(e) => {
                      setNewQuarryId(e.target.value);
                      if (!eligibleVendorIds.includes(newVendorId)) setNewVendorId('');
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
                  >
                    {allowedQuarries.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Tanggal Jadwal *
                  </label>
                  <input
                    type="date"
                    required
                    value={newScheduleDate}
                    onChange={(e) => setNewScheduleDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Vendor Transportasi *
                  </label>
                  <select
                    value={newVendorId}
                    onChange={(e) => handleVendorSelect(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden font-mono"
                  >
                    <option value="" disabled>
                      {eligibleVendors.length === 0 ? 'Belum ada vendor dengan tarif rute ini' : 'Pilih vendor...'}
                    </option>
                    {eligibleVendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({vehicles.filter((veh) => veh.transportVendorId === v.id).length} armada)
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setAddError(null);
                      setShowNewVendorForm((s) => !s);
                    }}
                    className="mt-1.5 text-[11px] font-semibold text-[#003C16] hover:underline"
                  >
                    {showNewVendorForm ? '− Batal tambah vendor' : '+ Tambah vendor baru'}
                  </button>
                  {showNewVendorForm && (
                    <div className="mt-2 p-2.5 rounded-md bg-emerald-50 border border-emerald-200 space-y-2">
                      <input
                        type="text"
                        placeholder="Nama vendor / perorangan *"
                        value={newVendorName}
                        onChange={(e) => setNewVendorName(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
                      />
                      <input
                        type="text"
                        placeholder="No. HP (opsional)"
                        value={newVendorPhone}
                        onChange={(e) => setNewVendorPhone(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
                      />
                      <select
                        value={newVendorSupplyType}
                        onChange={(e) =>
                          setNewVendorSupplyType(e.target.value as 'TRANSPORT_ONLY' | 'MATERIAL_AND_TRANSPORT')
                        }
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
                      >
                        <option value="TRANSPORT_ONLY">Angkut saja (harga tarif transport)</option>
                        <option value="MATERIAL_AND_TRANSPORT">
                          All-in (harga termasuk material + angkut)
                        </option>
                      </select>
                      <button
                        type="button"
                        onClick={handleSaveNewVendor}
                        className="w-full px-2.5 py-1.5 rounded-md text-[11px] font-bold text-white bg-[#003C16] hover:bg-[#002B10]"
                      >
                        Simpan Vendor
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Armada Truk *
                  </label>
                  <select
                    value={newVehicleId}
                    onChange={(e) => setNewVehicleId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden font-mono"
                  >
                    {filteredVehicles.length === 0 && (
                      <option value="">Belum ada armada untuk vendor ini</option>
                    )}
                    {filteredVehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plateNumber} - {v.nominalCapacityM3} m³
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setAddError(null);
                      setShowNewVehicleForm((s) => !s);
                    }}
                    className="mt-1.5 text-[11px] font-semibold text-[#003C16] hover:underline"
                  >
                    {showNewVehicleForm ? '− Batal tambah armada' : '+ Tambah armada baru'}
                  </button>
                  {showNewVehicleForm && (
                    <div className="mt-2 p-2.5 rounded-md bg-emerald-50 border border-emerald-200 space-y-2">
                      <input
                        type="text"
                        placeholder="Nomor polisi / nama armada *"
                        value={newVehiclePlate}
                        onChange={(e) => setNewVehiclePlate(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
                      />
                      <input
                        type="number"
                        min={1}
                        placeholder="Kapasitas (m³)"
                        value={newVehicleCapacity}
                        onChange={(e) => setNewVehicleCapacity(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={handleSaveNewVehicle}
                        className="w-full px-2.5 py-1.5 rounded-md text-[11px] font-bold text-white bg-[#003C16] hover:bg-[#002B10]"
                      >
                        Simpan Armada
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {addError && (
                <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  {addError}
                </div>
              )}

              <div
                className={`p-3 rounded-md border text-xs ${
                  resolvedRate
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-amber-50 border-amber-200'
                }`}
              >
                {resolvedRate ? (
                  <>
                    <div className="font-bold text-slate-800 mb-1">Tarif Angkutan Berlaku</div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">
                        {resolvedRate.pricingModel === 'ALL_IN'
                          ? 'All-in (material + angkut)'
                          : `Harga per ${
                              resolvedRate.pricingModel === 'PER_TRIP'
                                ? 'ritase'
                                : resolvedRate.pricingModel === 'PER_TON'
                                ? 'ton'
                                : 'm³'
                            }`}
                      </span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatIDR(resolvedRate.ratePerUnit)}
                        {resolvedRate.pricingModel === 'PER_TRIP' ? '/rit' : resolvedRate.pricingModel === 'PER_TON' ? '/ton' : '/m³'}
                      </span>
                    </div>
                    {hasExtraFees && (
                      <div className="flex items-center justify-between mt-1 text-slate-600">
                        <span>Biaya tambahan</span>
                        <span className="font-mono">
                          {[
                            toll > 0 ? `Toll ${formatIDR(toll)}` : '',
                            loading > 0 ? `Muat ${formatIDR(loading)}` : '',
                            unloading > 0 ? `Bongkar ${formatIDR(unloading)}` : '',
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </div>
                    )}
                    {resolvedRate.effectiveDate && (
                      <div className="text-[10px] text-slate-400 mt-1">
                        Berlaku sejak {formatDate(resolvedRate.effectiveDate)}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="font-bold text-amber-800">
                    ⚠ Vendor belum punya tarif aktif untuk rute ini — atur tarif di Modul Logistik sebelum terbitkan surat jalan.
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nama Pengemudi (Driver) *
                </label>
                <select
                  value={newDriverId}
                  onChange={(e) => setNewDriverId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
                >
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} ({d.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Estimasi Volume Muat Awal (m³) *
                </label>
                <input
                  type="number"
                  step={0.1}
                  required
                  min={1}
                  value={newLoadedVolume}
                  onChange={(e) => setNewLoadedVolume(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm font-mono font-bold border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreatingDelivery(false)}
                  className="px-3 py-2 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md text-xs font-bold text-white bg-[#003C16] hover:bg-[#002B10] flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" /> Terbitkan Surat Jalan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modals */}
      <SuratJalanPrintModal
        delivery={selectedDeliveryForPrint}
        onClose={() => setSelectedDeliveryForPrint(null)}
      />

      <WeighbridgeModal
        delivery={selectedDeliveryForWb}
        onClose={() => setSelectedDeliveryForWb(null)}
      />

      <PodModal
        delivery={selectedDeliveryForPod}
        onClose={() => setSelectedDeliveryForPod(null)}
      />

      {/* Detail Modal */}
      {selectedDetailDelivery && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold font-mono">Detail Surat Jalan — {selectedDetailDelivery.deliveryNumber}</h3>
              <button onClick={() => setSelectedDetailDelivery(null)} className="text-white/80 hover:text-white">✕</button>
            </div>
            <div className="p-5 overflow-y-auto space-y-3 text-xs">
              {(() => {
                const d = selectedDetailDelivery;
                const prod = products.find((p) => p.id === d.productId);
                const cust = customers.find((c) => c.id === contracts.find((co) => co.id === d.contractId)?.customerId);
                const proj = projects.find((p) => p.id === contracts.find((co) => co.id === d.contractId)?.projectId);
                const qry = quarries.find((q) => q.id === d.quarryId);
                const veh = vehicles.find((v) => v.id === d.vehicleId);
                const ven = transportVendors.find((v) => v.id === d.transportVendorId);
                return (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div><span className="text-slate-500">No. SJ RBN:</span> <span className="font-mono font-bold">{d.deliveryNumber}</span></div>
                      {cust?.name?.toLowerCase().includes('imci') && (
                        <div><span className="text-slate-500">No. SJ IMCI:</span> <span className="font-mono">{d.quarryLoadingInfo?.notes?.includes('SJ IMCI') ? d.quarryLoadingInfo.notes.replace('SJ IMCI ', '') : '-'}</span></div>
                      )}
                      <div><span className="text-slate-500">Status:</span> <span className="font-bold">{d.status}</span></div>
                      <div><span className="text-slate-500">Tanggal:</span> <span className="font-mono">{formatDate(d.scheduledDate)}</span></div>
                      <div><span className="text-slate-500">Pelanggan:</span> <span className="font-semibold">{cust?.name || '-'}</span></div>
                      <div><span className="text-slate-500">Proyek:</span> <span className="font-semibold">{proj?.name || '-'}</span></div>
                      <div><span className="text-slate-500">Quarry:</span> <span>{qry?.name || '-'}</span></div>
                      <div><span className="text-slate-500">Material:</span> <span>{prod?.name || '-'}</span></div>
                      <div><span className="text-slate-500">Armada:</span> <span className="font-mono">{veh?.plateNumber || '-'} ({d.driverName || '-'})</span></div>
                      <div><span className="text-slate-500">Vendor:</span> <span>{ven?.name || '-'}</span></div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
                      <div className="bg-slate-50 p-2 rounded text-center"><div className="text-[10px] text-slate-500">Loaded</div><div className="font-mono font-bold">{formatVolumeM3(d.loadedVolumeM3, false)}</div></div>
                      <div className="bg-slate-50 p-2 rounded text-center"><div className="text-[10px] text-slate-500">Received</div><div className="font-mono font-bold">{d.receivedVolumeM3 ? formatVolumeM3(d.receivedVolumeM3, false) : '-'}</div></div>
                      <div className="bg-emerald-50 p-2 rounded text-center"><div className="text-[10px] text-slate-500">Approved</div><div className="font-mono font-bold text-emerald-800">{d.approvedVolumeM3 ? formatVolumeM3(d.approvedVolumeM3, false) : '-'}</div></div>
                    </div>
                    {cust?.name?.toLowerCase().includes('imci') && d.status === 'DELIVERED' && (
                      <div className="bg-amber-50 p-3 rounded border border-amber-200">
                        <p className="text-[11px] font-bold text-amber-900">
                          {d.quarryLoadingInfo?.notes?.includes('SJ IMCI') ? 'Edit No. SJ IMCI (revisi):' : 'Tambah No. SJ IMCI untuk penagihan:'}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <input
                            type="text"
                            value={imciInput || (d.quarryLoadingInfo?.notes?.includes('SJ IMCI') ? d.quarryLoadingInfo.notes.replace('SJ IMCI ', '') : '')}
                            onChange={(e) => setImciInput(e.target.value)}
                            placeholder="100818"
                            className="flex-1 px-2 py-1.5 text-xs border border-amber-300 rounded font-mono focus:ring-2 focus:ring-amber-500 outline-none"
                          />
                          <button
                            onClick={() => {
                              const cur = d.quarryLoadingInfo?.notes?.includes('SJ IMCI') ? d.quarryLoadingInfo.notes.replace('SJ IMCI ', '') : '';
                              const v = (imciInput || cur).trim();
                              if (!v) return;
                              const updated: Delivery = {
                                ...d,
                                quarryLoadingInfo: { ...(d.quarryLoadingInfo as any), notes: `SJ IMCI ${v}` },
                              };
                              // @ts-ignore — updateDelivery expects Partial<Delivery>
                              updateDelivery(d.id, { quarryLoadingInfo: updated.quarryLoadingInfo } as any);
                              setImciInput('');
                              setSelectedDetailDelivery(updated);
                            }}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold"
                          >
                            {d.quarryLoadingInfo?.notes?.includes('SJ IMCI') ? 'Update' : 'Simpan'}
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="bg-slate-50 p-3 rounded border text-[11px]">
                      <p><span className="text-slate-500">Timbangan Net:</span> {d.weighbridge ? formatWeightKg(d.weighbridge.netWeightKg) : '-'}</p>
                      {d.quarryLoadingInfo && <p className="mt-1"><span className="text-slate-500">Petugas Quarry:</span> {d.quarryLoadingInfo.checkerName || '-'}</p>}
                      {d.pod && <p><span className="text-slate-500">Penerima POD:</span> {d.pod.recipientName || '-'}</p>}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
        )}
      <Dialog open={showBulk} onOpenChange={setShowBulk}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto p-0 gap-0 sm:max-w-6xl">
          <DialogHeader className="px-4 py-3 border-b bg-muted/50 rounded-t-lg shrink-0">
            <DialogTitle className="text-sm font-bold">Ritase Massal (Bulk) — Import CSV/XLSX</DialogTitle>
          </DialogHeader>
          <div className="overflow-auto">
            <BulkErrorBoundary><BulkDeliveriesView /></BulkErrorBoundary>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    );
  };
