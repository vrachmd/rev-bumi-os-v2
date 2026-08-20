import React, { useState } from 'react';
import {
  Mountain,
  Building2,
  Truck,
  Scale,
  Camera,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  MapPin,
  Clock,
  UserCheck,
  FileCheck2,
  Printer,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  Info,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Delivery, QuarryLoadingInfo, SiteUnloadingInfo } from '../../types';
import { formatDate, formatDateTime, formatVolumeM3, formatWeightKg, formatWeightTon } from '../../lib/formatters';
import { SignaturePad } from '../common/SignaturePad';

interface FieldHandoverViewProps {
  onNavigateToDeliveries?: () => void;
  onNavigateToReconcile?: () => void;
}

export const FieldHandoverView: React.FC<FieldHandoverViewProps> = ({
  onNavigateToDeliveries,
  onNavigateToReconcile,
}) => {
  const {
    deliveries,
    quarries,
    projects,
    customers,
    contracts,
    products,
    vehicles,
    drivers,
    quarryMaterialCosts,
    currentProfile,
    recordQuarryLoading,
    recordSiteArrival,
    recordSiteUnloading,
  } = useApp();

  const getDensity = (productId: string, quarryId?: string): number => {
    if (quarryId) {
      const qmc = quarryMaterialCosts.find((x) => x.productId === productId && x.quarryId === quarryId);
      if (qmc?.density != null) return qmc.density;
    }
    return products.find((p) => p.id === productId)?.density || 1.6;
  };

  // Tab: 'quarry-loading' | 'site-unloading' | 'handover-pipeline'
  const [activeStage, setActiveStage] = useState<'quarry-loading' | 'site-unloading' | 'handover-pipeline'>(
    currentProfile.role === 'SITE_CHECKER'
      ? 'site-unloading'
      : currentProfile.role === 'QUARRY_CHECKER'
      ? 'quarry-loading'
      : 'handover-pipeline'
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuarryId, setSelectedQuarryId] = useState<string>('ALL');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Selected delivery for Loading/Unloading modal/drawer
  const [activeLoadingDelivery, setActiveLoadingDelivery] = useState<Delivery | null>(null);
  const [activeUnloadingDelivery, setActiveUnloadingDelivery] = useState<Delivery | null>(null);

  // Quarry Loading Form State
  const [loadingMethod, setLoadingMethod] = useState<'WEIGHBRIDGE' | 'TRUCK_BED_VOLUME'>('WEIGHBRIDGE');
  const [grossKg, setGrossKg] = useState<number>(40000);
  const [tareKg, setTareKg] = useState<number>(12000);
  const [dimLengthM, setDimLengthM] = useState<number>(5.4);
  const [dimWidthM, setDimWidthM] = useState<number>(2.3);
  const [dimHeightM, setDimHeightM] = useState<number>(1.4);
  const [quarryNotes, setQuarryNotes] = useState('Muatan batu split gradasi bersih, bak tertutup terpal standar.');
  const [quarrySignature, setQuarrySignature] = useState<string>('');
  const [quarryPhoto, setQuarryPhoto] = useState<string>(
    'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=600&auto=format&fit=crop&q=80'
  );

  // Site Unloading Form State
  const [unloadingMethod, setUnloadingMethod] = useState<'TRUCK_BED_VOLUME' | 'DIPSTICK_ROD' | 'SITE_SCALE'>('TRUCK_BED_VOLUME');
  const [siteReceivedM3, setSiteReceivedM3] = useState<number>(24.0);
  const [siteDimLengthM, setSiteDimLengthM] = useState<number>(5.4);
  const [siteDimWidthM, setSiteDimWidthM] = useState<number>(2.3);
  const [siteDimHeightM, setSiteDimHeightM] = useState<number>(1.38);
  const [siteConditionNotes, setSiteConditionNotes] = useState('Material diterima dan dibongkar di stock yard seksi 5B. Kondisi fisik sesuai spec.');
  const [siteSignature, setSiteSignature] = useState<string>('');
  const [sitePhoto, setSitePhoto] = useState<string>(
    'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=600&auto=format&fit=crop&q=80'
  );
  const [siteGps, setSiteGps] = useState<{ lat: number; lng: number }>({ lat: -6.78912, lng: 108.01234 });
  const [isGettingGps, setIsGettingGps] = useState(false);

  // Computed calculations for Quarry Loading — density per quarry×product (qmc) fallback products.density
  const activeDensity = getDensity(activeLoadingDelivery?.productId ?? '', activeLoadingDelivery?.quarryId);
  const netWeightKg = Math.max(0, grossKg - tareKg);
  const calculatedM3FromWeight = Number(((netWeightKg / 1000) / activeDensity).toFixed(2));
  const calculatedM3FromDimensions = Number((dimLengthM * dimWidthM * dimHeightM).toFixed(2));
  const finalLoadingM3 = loadingMethod === 'WEIGHBRIDGE' ? calculatedM3FromWeight : calculatedM3FromDimensions;

  // Validasi kapasitas kendaraan (overload warning)
  const activeVehicle = vehicles.find((v) => v.id === activeLoadingDelivery?.vehicleId);
  const nominalM3 = activeVehicle?.nominalCapacityM3 || 0;
  const maxM3 = nominalM3 * 1.05;
  const maxKg = maxM3 * activeDensity * 1000;
  const isOverloadWeight = loadingMethod === 'WEIGHBRIDGE' && netWeightKg > maxKg && nominalM3 > 0;
  const isOverloadVolume = finalLoadingM3 > maxM3 && nominalM3 > 0;

  // Computed calculations for Site Unloading
  const unloadingDensity = getDensity(activeUnloadingDelivery?.productId ?? '', activeUnloadingDelivery?.quarryId);
  const calculatedSiteM3FromDimensions = Number((siteDimLengthM * siteDimWidthM * siteDimHeightM).toFixed(2));
  const activeLoadedM3 = activeUnloadingDelivery?.loadedVolumeM3 || 24.0;
  const varianceM3 = Number((activeLoadedM3 - siteReceivedM3).toFixed(2));
  const variancePercent = activeLoadedM3 > 0 ? Number(((varianceM3 / activeLoadedM3) * 100).toFixed(2)) : 0;
  const activeContract = contracts.find((c) => c.id === activeUnloadingDelivery?.contractId);
  const contractTolerance = activeContract?.tolerancePercent || 2.0;
  const isWithinTolerance = Math.abs(variancePercent) <= contractTolerance;

  // Reference: Truck bed volume & tonnage reference (tronton)
  const [refLength, setRefLength] = useState<number>(6.0);
  const [refWidth, setRefWidth] = useState<number>(2.3);
  const [refHeight, setRefHeight] = useState<number>(1.2);
  const refVolumeM3 = Number((refLength * refWidth * refHeight).toFixed(2));
  const refTons = Number((refVolumeM3 * unloadingDensity).toFixed(2));

  const showToast = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  // Open Loading Modal
  const handleOpenLoading = (del: Delivery) => {
    setActiveLoadingDelivery(del);
    const dens = getDensity(del.productId, del.quarryId);
    const initialNetKg = del.loadedWeightKg || Math.round(del.loadedVolumeM3 * dens * 1000) || 38400;
    setTareKg(12000);
    setGrossKg(initialNetKg + 12000);
    setDimLengthM(5.4);
    setDimWidthM(2.3);
    setDimHeightM(del.loadedVolumeM3 > 0 ? Number((del.loadedVolumeM3 / (5.4 * 2.3)).toFixed(2)) : 1.4);
    const prodName = products.find((p) => p.id === del.productId)?.name || 'material agregat';
    setQuarryNotes(`Muatan ${prodName} dari Quarry.`);
  };

  // Submit Quarry Loading
  const handleSaveQuarryLoading = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeLoadingDelivery) return;

    const res = recordQuarryLoading(activeLoadingDelivery.id, {
      measurementMethod: loadingMethod,
      loadedVolumeM3: finalLoadingM3,
      loadedWeightKg: loadingMethod === 'WEIGHBRIDGE' ? netWeightKg : Math.round(finalLoadingM3 * activeDensity * 1000),
      grossWeightKg: loadingMethod === 'WEIGHBRIDGE' ? grossKg : undefined,
      tareWeightKg: loadingMethod === 'WEIGHBRIDGE' ? tareKg : undefined,
      netWeightKg: loadingMethod === 'WEIGHBRIDGE' ? netWeightKg : undefined,
      truckBedDimensions: {
        lengthM: dimLengthM,
        widthM: dimWidthM,
        heightM: dimHeightM,
        calculatedM3: calculatedM3FromDimensions,
      },
      densityUsed: activeDensity,
      notes: quarryNotes,
      quarryPhotoUrl: quarryPhoto,
      signatureUrl: quarrySignature || 'signed:petugas_quarry',
      checkerName: currentProfile.fullName,
    });

    if (res.success) {
      showToast(`✅ Truk ${activeLoadingDelivery.deliveryNumber} selesai loading (${finalLoadingM3} m³). Berangkat menuju Site Proyek.`);
      setActiveLoadingDelivery(null);
    }
  };

  // Open Unloading Modal
  const handleOpenUnloading = (del: Delivery) => {
    setActiveUnloadingDelivery(del);
    setSiteReceivedM3(del.receivedVolumeM3 > 0 ? del.receivedVolumeM3 : del.loadedVolumeM3);
    setSiteDimLengthM(5.4);
    setSiteDimWidthM(2.3);
    setSiteDimHeightM(del.loadedVolumeM3 > 0 ? Number((del.loadedVolumeM3 / (5.4 * 2.3) * 0.98).toFixed(2)) : 1.38);
    setSiteConditionNotes('Material diterima di site proyek. Kondisi visual bersih sesuai spesifikasi kontrak.');
  };

  // Acquire GPS at Site
  const handleAcquireSiteGps = () => {
    if (!navigator.geolocation) {
      showToast('GPS tidak didukung oleh browser.');
      return;
    }
    setIsGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSiteGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setIsGettingGps(false);
        showToast('📍 Koordinat GPS Site Proyek Berhasil Dikunci!');
      },
      (err) => {
        setIsGettingGps(false);
        showToast('Gagal membaca GPS: ' + err.message);
      },
      { timeout: 7000 }
    );
  };

  // Submit Site Unloading
  const handleSaveSiteUnloading = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUnloadingDelivery) return;

    const res = recordSiteUnloading(activeUnloadingDelivery.id, {
      measurementMethod: unloadingMethod,
      receivedVolumeM3: siteReceivedM3,
      truckBedDimensions: {
        lengthM: siteDimLengthM,
        widthM: siteDimWidthM,
        heightM: siteDimHeightM,
        calculatedM3: calculatedSiteM3FromDimensions,
      },
      conditionNotes: siteConditionNotes,
      sitePhotoUrl: sitePhoto,
      signatureUrl: siteSignature || 'signed:petugas_site',
      checkerName: currentProfile.fullName,
      gpsLatitude: siteGps.lat,
      gpsLongitude: siteGps.lng,
    });

    if (res.success) {
      showToast(`✅ Verifikasi Unloading ${activeUnloadingDelivery.deliveryNumber} selesai (${siteReceivedM3} m³). e-POD berhasil diterbitkan.`);
      setActiveUnloadingDelivery(null);
    }
  };

  // Pipeline Filtered lists
  const quarryQueue = deliveries.filter(
    (d) => d.status === 'PLANNED' || d.status === 'SCHEDULED' || d.status === 'LOADING'
  );

  const inTransitQueue = deliveries.filter(
    (d) => d.status === 'IN_TRANSIT' || d.status === 'ARRIVED'
  );

  const siteCompletedQueue = deliveries.filter(
    (d) => d.status === 'UNLOADED' || d.status === 'POD_SUBMITTED' || d.status === 'DELIVERED'
  );

  return (
    <div className="space-y-5 pb-12">
      {/* Toast Banner */}
      {actionSuccessMsg && (
        <div className="bg-[#003C16] text-white p-3.5 rounded-lg text-xs font-semibold shadow-md flex items-center justify-between animate-fadeIn">
          <span>{actionSuccessMsg}</span>
          <button onClick={() => setActionSuccessMsg(null)} className="text-white/80 hover:text-white ml-3">✕</button>
        </div>
      )}

      {/* Header Banner with Handover Concept */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#003C16]/10 text-[#003C16] text-[11px] font-bold tracking-wide uppercase">
                Kontrol Lapangan Terintegrasi
              </span>
              <span className="text-xs text-slate-500 font-medium">Quarry Loading ⟷ Site Unloading</span>
            </div>
            <h1 className="text-lg font-black text-slate-900 mt-1">
              Sistem Serah Terima & Pengukuran Berkesinambungan
            </h1>
            <p className="text-xs text-slate-600 mt-0.5 max-w-2xl">
              Alur kerja lapangan dua tahap: <strong>Petugas Quarry</strong> mengukur kubikasi/tonase saat selesai muat & menerbitkan surat jalan, lalu <strong>Petugas Site Proyek</strong> memverifikasi kubikasi fisik saat pembongkaran serta menerbitkan bukti e-POD.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <div className="text-center px-3 border-r border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Antrean Quarry</span>
              <span className="text-base font-black text-amber-700">{quarryQueue.length} Rit</span>
            </div>
            <div className="text-center px-3 border-r border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold block uppercase">In-Transit</span>
              <span className="text-base font-black text-blue-700">{inTransitQueue.length} Rit</span>
            </div>
            <div className="text-center px-3">
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Tiba & Unloaded</span>
              <span className="text-base font-black text-emerald-800">{siteCompletedQueue.length} Rit</span>
            </div>
          </div>
        </div>

        {/* Stage Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-5 pt-4 border-t border-slate-100">
          <button
            onClick={() => setActiveStage('quarry-loading')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
              activeStage === 'quarry-loading'
                ? 'bg-[#003C16] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Mountain className="w-4 h-4" />
            <span>1. Petugas Quarry (Loading & Timbang)</span>
            <span className="px-1.5 py-0.2 bg-white/20 text-white rounded text-[10px] ml-1">
              {quarryQueue.length}
            </span>
          </button>

          <button
            onClick={() => setActiveStage('site-unloading')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
              activeStage === 'site-unloading'
                ? 'bg-[#003C16] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>2. Petugas Site Proyek (Unloading & Verifikasi)</span>
            <span className="px-1.5 py-0.2 bg-white/20 text-white rounded text-[10px] ml-1">
              {inTransitQueue.length}
            </span>
          </button>

          <button
            onClick={() => setActiveStage('handover-pipeline')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
              activeStage === 'handover-pipeline'
                ? 'bg-[#003C16] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>3. Matriks Perbandingan Quarry vs Site</span>
          </button>
        </div>
      </div>

      {/* STAGE 1: PETUGAS QUARRY (LOADING CONTROL) */}
      {activeStage === 'quarry-loading' && (
        <div className="space-y-4">
          <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3.5 flex items-start gap-3 text-xs text-amber-900">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Instruksi Kerja Petugas Lapangan di Quarry:</p>
              <p className="mt-0.5 text-amber-800">
                1. Periksa fisik truk dan material agregat yang dimuat. 2. Lakukan penimbangan jembatan timbang (Gross & Tare) ATAU ukur dimensi bak muatan $(P \times L \times T)$. 3. Ambil foto muatan dan tanda tangani surat jalan digital untuk memberangkatkan truk ke site.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {quarryQueue.length === 0 ? (
              <div className="col-span-3 bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">
                <Truck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="font-bold text-sm text-slate-700">Tidak ada antrean truk di Quarry saat ini.</p>
                <p className="text-xs mt-1">Semua truk terjadwal telah selesai di-loading dan diberangkatkan.</p>
              </div>
            ) : (
              quarryQueue.map((del) => {
                const prod = products.find((p) => p.id === del.productId);
                const veh = vehicles.find((v) => v.id === del.vehicleId);
                const drv = drivers.find((d) => d.id === del.driverId);
                const qry = quarries.find((q) => q.id === del.quarryId);
                const con = contracts.find((c) => c.id === del.contractId);
                const proj = projects.find((p) => p.id === con?.projectId);

                return (
                  <div
                    key={del.id}
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                        <span className="font-mono font-bold text-xs text-slate-900">{del.deliveryNumber}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          {del.status}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-700">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Quarry Asal:</span>
                          <span className="font-semibold text-slate-900">{qry?.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Proyek Tujuan:</span>
                          <span className="font-semibold text-slate-900">{proj?.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Produk:</span>
                          <span className="font-semibold text-slate-900">{prod?.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Armada & Supir:</span>
                          <span className="font-mono font-bold text-slate-900">{veh?.plateNumber} ({del.driverName || drv?.fullName || '-'})</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Kapasitas Bak:</span>
                          <span className="font-mono text-slate-700">{veh?.nominalCapacityM3 || 24} m³</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Estimasi Muatan</span>
                        <span className="text-sm font-black text-[#003C16]">
                          {formatVolumeM3(del.loadedVolumeM3 || veh?.nominalCapacityM3 || 24)}
                        </span>
                      </div>
                      <button
                        onClick={() => handleOpenLoading(del)}
                        className="px-3.5 py-2 bg-[#003C16] hover:bg-[#002B10] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                      >
                        <Scale className="w-3.5 h-3.5" /> Ukur & Dispatch
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* STAGE 2: PETUGAS SITE PROYEK (UNLOADING & VERIFIKASI) */}
      {activeStage === 'site-unloading' && (
        <div className="space-y-4">
          <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-3.5 flex items-start gap-3 text-xs text-blue-900">
            <Building2 className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Instruksi Kerja Petugas Lapangan di Site Proyek (Receiver):</p>
              <p className="mt-0.5 text-blue-800">
                1. Sambut kedatangan truk di pos penerimaan site (klik "Konfirmasi Tiba"). 2. Ukur kubikasi aktual saat unloading / pembongkaran. 3. Sistem akan otomatis membandingkan dengan kubikasi asal Quarry dan mengevaluasi toleransi kontrak ($\le 2\%$). 4. Ambil foto material & tanda tangani e-POD.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {inTransitQueue.length === 0 ? (
              <div className="col-span-3 bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">
                <Truck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="font-bold text-sm text-slate-700">Tidak ada truk in-transit menuju proyek saat ini.</p>
                <p className="text-xs mt-1">Semua kiriman yang tiba telah selesai diverifikasi dan di-unloading.</p>
              </div>
            ) : (
              inTransitQueue.map((del) => {
                const prod = products.find((p) => p.id === del.productId);
                const veh = vehicles.find((v) => v.id === del.vehicleId);
                const drv = drivers.find((d) => d.id === del.driverId);
                const qry = quarries.find((q) => q.id === del.quarryId);
                const con = contracts.find((c) => c.id === del.contractId);
                const proj = projects.find((p) => p.id === con?.projectId);

                return (
                  <div
                    key={del.id}
                    className={`bg-white border rounded-xl p-4 shadow-2xs flex flex-col justify-between ${
                      del.status === 'ARRIVED' ? 'border-emerald-300 ring-2 ring-emerald-500/20' : 'border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                        <span className="font-mono font-bold text-xs text-slate-900">{del.deliveryNumber}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            del.status === 'ARRIVED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-blue-100 text-blue-800 border border-blue-300'
                          }`}
                        >
                          {del.status === 'ARRIVED' ? '📍 SUDAH DI SITE' : '🚚 DALAM PERJALANAN'}
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-700">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Proyek Penerima:</span>
                          <span className="font-semibold text-slate-900">{proj?.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Dari Quarry:</span>
                          <span className="font-semibold text-slate-900">{qry?.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Material:</span>
                          <span className="font-semibold text-slate-900">{prod?.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Armada & Supir:</span>
                          <span className="font-mono font-bold text-slate-900">{veh?.plateNumber} ({del.driverName || drv?.fullName || '-'})</span>
                        </div>
                        <div className="flex justify-between bg-slate-50 p-1.5 rounded border border-slate-100 mt-1">
                          <span className="text-slate-600 font-semibold">Hasil Ukur Quarry:</span>
                          <span className="font-mono font-extrabold text-[#003C16]">
                            {formatVolumeM3(del.loadedVolumeM3)} (
                            {formatWeightTon(
                              del.loadedWeightKg && del.loadedWeightKg > 0
                                ? del.loadedWeightKg
                                : Math.round(del.loadedVolumeM3 * (products.find((p) => p.id === del.productId)?.density || 1.6) * 1000)
                            )}
                            )
                          </span>
                        </div>
                        {del.quarryLoadingInfo?.checkerName && (
                          <p className="text-[10px] text-slate-500">
                            Petugas Quarry: <span className="font-medium text-slate-700">{del.quarryLoadingInfo.checkerName}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      {del.status === 'IN_TRANSIT' ? (
                        <button
                          onClick={() => {
                            recordSiteArrival(del.id, { lat: -6.78912, lng: 108.01234 });
                            showToast(`📍 Truk ${del.deliveryNumber} dikonfirmasi tiba di site.`);
                          }}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                        >
                          <MapPin className="w-3.5 h-3.5" /> Konfirmasi Truk Tiba
                        </button>
                      ) : (
                        <button
                          onClick={() => handleOpenUnloading(del)}
                          className="w-full py-2 bg-[#003C16] hover:bg-[#002B10] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Verifikasi Kubikasi Unloading & e-POD
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* STAGE 3: MATRIKS PERBANDINGAN QUARRY VS SITE (CONTINUOUS PIPELINE) */}
      {activeStage === 'handover-pipeline' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari Surat Jalan, Plat Truk, atau Lokasi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Filter Quarry:</span>
              <select
                value={selectedQuarryId}
                onChange={(e) => setSelectedQuarryId(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white text-slate-800 outline-hidden font-medium"
              >
                <option value="ALL">Semua Quarry</option>
                {quarries.map((q) => (
                  <option key={q.id} value={q.id}>{q.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3.5">No. Surat Jalan</th>
                    <th className="py-3 px-3">Status Alur</th>
                    <th className="py-3 px-3">Material & Armada</th>
                    <th className="py-3 px-3 text-right bg-amber-50/50">1. Ukur Quarry (m³)</th>
                    <th className="py-3 px-3 text-right bg-blue-50/50">2. Ukur Site (m³)</th>
                    <th className="py-3 px-3 text-right">Selisih (m³)</th>
                    <th className="py-3 px-3 text-center">Toleransi Kontrak</th>
                    <th className="py-3 px-3 text-center">Petugas Lapangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {deliveries
                    .filter((d) => {
                      if (selectedQuarryId !== 'ALL' && d.quarryId !== selectedQuarryId) return false;
                      if (!searchTerm) return true;
                      const veh = vehicles.find((v) => v.id === d.vehicleId);
                      return (
                        d.deliveryNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        veh?.plateNumber.toLowerCase().includes(searchTerm.toLowerCase())
                      );
                    })
                    .map((d) => {
                      const prod = products.find((p) => p.id === d.productId);
                      const veh = vehicles.find((v) => v.id === d.vehicleId);
                      const con = contracts.find((c) => c.id === d.contractId);
                      const tol = con?.tolerancePercent || 2.0;

                      const loadedM3 = d.loadedVolumeM3 || 0;
                      const receivedM3 = d.receivedVolumeM3 || 0;
                      const varM3 = receivedM3 > 0 ? Number((loadedM3 - receivedM3).toFixed(2)) : 0;
                      const varPct = loadedM3 > 0 && receivedM3 > 0 ? Number(((varM3 / loadedM3) * 100).toFixed(2)) : 0;
                      const diffM3 = receivedM3 - loadedM3;
                      const isOk = Math.abs(varPct) <= tol;

                      return (
                        <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-3.5">
                            <p className="font-bold text-slate-900 font-mono text-[13px]">{d.deliveryNumber}</p>
                            <span className="text-[10px] text-slate-500">{formatDate(d.scheduledDate)}</span>
                          </td>

                          <td className="py-3 px-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                d.status === 'DELIVERED' || d.status === 'POD_SUBMITTED'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : d.status === 'IN_TRANSIT'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                  : 'bg-amber-100 text-amber-800 border border-amber-300'
                              }`}
                            >
                              {d.status}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <p className="font-semibold text-slate-900">{prod?.name}</p>
                            <p className="text-[11px] font-mono text-slate-500">{veh?.plateNumber}</p>
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-bold text-amber-900 bg-amber-50/40">
                            {loadedM3 > 0 ? formatVolumeM3(loadedM3, false) : '-'}
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-bold text-blue-900 bg-blue-50/40">
                            {receivedM3 > 0 ? formatVolumeM3(receivedM3, false) : '-'}
                          </td>

                          <td className="py-3 px-3 text-right font-mono font-extrabold">
                            {receivedM3 > 0 ? (
                              <span className={diffM3 < 0 ? 'text-rose-600' : diffM3 > 0 ? 'text-emerald-600' : 'text-slate-800'}>
                                {diffM3 === 0 ? '0.00' : `${diffM3 > 0 ? '+' : '-'}${Math.abs(diffM3).toFixed(2)}`} m³ ({varPct}%)
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-center">
                            {receivedM3 > 0 ? (
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isOk
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                                }`}
                              >
                                {isOk ? `Aman (≤ ${tol}%)` : `Melebihi (${varPct}%)`}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Menunggu Unload</span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-center text-[10px] text-slate-600">
                            <div className="space-y-0.5 text-left">
                              <p className="truncate max-w-[130px]">
                                🏗️ <strong>Q:</strong> {d.quarryLoadingInfo?.checkerName || 'Ahmad Fauzi'}
                              </p>
                              <p className="truncate max-w-[130px]">
                                🏢 <strong>S:</strong> {d.siteUnloadingInfo?.checkerName || d.pod?.recipientName || '-'}
                              </p>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PETUGAS QUARRY (LOADING MEASUREMENT) */}
      {activeLoadingDelivery && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="px-5 py-3.5 bg-[#003C16] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Mountain className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  Pengukuran Loading di Quarry: {activeLoadingDelivery.deliveryNumber}
                </h3>
              </div>
              <button onClick={() => setActiveLoadingDelivery(null)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveQuarryLoading} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Method Selector */}
              <div>
                <label className="font-bold text-slate-700 block mb-1.5">Metode Pengukuran di Quarry:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLoadingMethod('WEIGHBRIDGE')}
                    className={`py-2 px-3 rounded-lg border text-center font-bold transition-all ${
                      loadingMethod === 'WEIGHBRIDGE'
                        ? 'border-[#003C16] bg-[#003C16]/10 text-[#003C16]'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    ⚖️ Jembatan Timbang (Bruto - Tara)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoadingMethod('TRUCK_BED_VOLUME')}
                    className={`py-2 px-3 rounded-lg border text-center font-bold transition-all ${
                      loadingMethod === 'TRUCK_BED_VOLUME'
                        ? 'border-[#003C16] bg-[#003C16]/10 text-[#003C16]'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    📐 Dimensi Bak Truk (P × L × T)
                  </button>
                </div>
              </div>

              {/* Weighbridge Mode Inputs */}
              {loadingMethod === 'WEIGHBRIDGE' && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Berat Kotor / Gross (kg) *</label>
                      <input
                        type="number"
                        value={grossKg}
                        onChange={(e) => setGrossKg(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono font-bold focus:ring-2 focus:ring-[#003C16] outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Berat Kosong / Tara (kg) *</label>
                      <input
                        type="number"
                        value={tareKg}
                        onChange={(e) => setTareKg(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono font-bold focus:ring-2 focus:ring-[#003C16] outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-slate-500 font-medium">Netto Material:</span>
                      <p className="font-mono font-black text-slate-900 text-sm">{formatWeightKg(netWeightKg)} ({formatWeightTon(netWeightKg)})</p>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 font-medium">Konversi Kubikasi (Densitas {activeDensity}):</span>
                      <p className="font-mono font-black text-[#003C16] text-base">{calculatedM3FromWeight} m³</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Truck Bed Dimensions Mode Inputs */}
              {loadingMethod === 'TRUCK_BED_VOLUME' && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Panjang (m)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={dimLengthM}
                        onChange={(e) => setDimLengthM(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono font-bold focus:ring-2 focus:ring-[#003C16] outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Lebar (m)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={dimWidthM}
                        onChange={(e) => setDimWidthM(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono font-bold focus:ring-2 focus:ring-[#003C16] outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Tinggi Muatan (m)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={dimHeightM}
                        onChange={(e) => setDimHeightM(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono font-bold focus:ring-2 focus:ring-[#003C16] outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                    <span className="text-slate-600 font-semibold">Hasil Hitung Volume Bak:</span>
                    <span className="font-mono font-black text-[#003C16] text-base">{calculatedM3FromDimensions} m³</span>
                  </div>
                </div>
              )}

              {(isOverloadWeight || isOverloadVolume) && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs">
                  <p className="font-bold">⚠️ Overload — melebihi kapasitas kendaraan</p>
                  <p>
                    Kapasitas: {nominalM3} m³ (+5% toleransi {maxM3.toFixed(2)} m³) · {maxKg.toLocaleString('id-ID')} kg @ {activeDensity.toFixed(2)} ton/m³ · Muatan: {finalLoadingM3} m³{' '}
                    {loadingMethod === 'WEIGHBRIDGE' ? `· ${netWeightKg.toLocaleString('id-ID')} kg` : ''}
                  </p>
                </div>
              )}

              {/* Photo & Notes */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Catatan Kondisi Muatan di Quarry:</label>
                <input
                  type="text"
                  value={quarryNotes}
                  onChange={(e) => setQuarryNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
                />
              </div>

              {/* E-Signature */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tanda Tangan Petugas Quarry ({currentProfile.fullName}):</label>
                <SignaturePad onSave={(data) => setQuarrySignature(data)} title="Tanda Tangan Dispatcher Quarry" />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveLoadingDelivery(null)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-md font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#003C16] hover:bg-[#002B10] text-white rounded-md font-bold flex items-center gap-1.5 shadow-2xs"
                >
                  <CheckCircle2 className="w-4 h-4" /> Simpan Hasil Ukur & Dispatch Truk (In-Transit)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PETUGAS SITE PROYEK (UNLOADING & VERIFIKASI) */}
      {activeUnloadingDelivery && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
            <div className="px-5 py-3.5 bg-blue-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-300" />
                <h3 className="text-sm font-bold uppercase tracking-wider">
                  Verifikasi Penerimaan & Unloading Site: {activeUnloadingDelivery.deliveryNumber}
                </h3>
              </div>
              <button onClick={() => setActiveUnloadingDelivery(null)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveSiteUnloading} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Quarry Origin Specs Card */}
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
                <span className="text-[10px] font-bold text-amber-800 uppercase block mb-1">
                  1. Data Kirim dari Quarry Asal:
                </span>
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <p className="text-slate-600">Petugas Loading Quarry:</p>
                    <p className="font-semibold text-slate-900">{activeUnloadingDelivery.quarryLoadingInfo?.checkerName || 'Ahmad Fauzi'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-600">Volume Kirim Quarry:</p>
                    <p className="font-mono font-black text-amber-900 text-base">{formatVolumeM3(activeLoadedM3)}</p>
                    <p className="text-[11px] text-amber-800 font-semibold">
                      ≈ {formatWeightTon(Math.round(activeLoadedM3 * unloadingDensity * 1000))} · {unloadingDensity.toFixed(2)} ton/m³
                    </p>
                  </div>
                </div>
              </div>

              {/* Site Measurement Input */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800">2. Hasil Ukur Fisik di Site Proyek (m³):</label>
                  <button
                    type="button"
                    onClick={handleAcquireSiteGps}
                    disabled={isGettingGps}
                    className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded font-semibold text-[11px] flex items-center gap-1 hover:bg-blue-200"
                  >
                    <MapPin className="w-3 h-3" /> {isGettingGps ? 'Membaca GPS...' : 'Kunci GPS Proyek'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Kubikasi Diterima Site (m³) *</label>
                    <input
                      type="number"
                      step="0.001"
                      value={siteReceivedM3}
                      onChange={(e) => setSiteReceivedM3(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono font-black text-slate-900 text-base focus:ring-2 focus:ring-blue-600 outline-hidden"
                    />
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex flex-col justify-center">
                    <span className="text-[10px] text-slate-500 font-medium">Selisih vs Quarry:</span>
                    <p
                      className={`font-mono font-bold text-sm ${
                        siteReceivedM3 < activeLoadedM3
                          ? 'text-rose-600'
                          : siteReceivedM3 > activeLoadedM3
                          ? 'text-emerald-600'
                          : 'text-slate-900'
                      }`}
                    >
                      {siteReceivedM3 === activeLoadedM3
                        ? '0.00'
                        : `${siteReceivedM3 > activeLoadedM3 ? '+' : '-'}${Math.abs(siteReceivedM3 - activeLoadedM3).toFixed(2)}`} m³ ({variancePercent}%)
                    </p>
                  </div>
                </div>

                {/* Tolerance Status Meter */}
                <div className={`p-3 rounded-lg border flex items-center gap-2.5 ${
                  isWithinTolerance ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}>
                  {isWithinTolerance ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <div>
                    <p className="font-bold text-xs">
                      {isWithinTolerance
                        ? `Dalam Batas Toleransi Kontrak (Toleransi: ${contractTolerance}%)`
                        : `Penyusutan Melebihi Toleransi Kontrak (${contractTolerance}%)`}
                    </p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {isWithinTolerance
                        ? 'Selisih wajar akibat pemadatan jalan / saringan. Disetujui otomatis untuk faktur.'
                        : 'Memerlukan Berita Acara Rekonsiliasi sebelum penerbitan faktur tagihan.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Reference: Truck Bed Volume & Tonnage (Tronton) */}
              <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-300 space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-teal-800 uppercase">📐 Acuan Kubikasi Bak Tronton</span>
                  <p className="text-[11px] text-teal-900/80 mt-0.5">
                    Dimensi umum bak tronton (P × L × T rata-rata). Volume & tonase dihitung otomatis
                    sebagai pembanding volume terima dan estimasi berat muatan di lapangan.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Panjang (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={refLength}
                      onChange={(e) => setRefLength(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono text-slate-900 focus:ring-2 focus:ring-teal-600 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Lebar (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={refWidth}
                      onChange={(e) => setRefWidth(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono text-slate-900 focus:ring-2 focus:ring-teal-600 outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Tinggi muatan (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={refHeight}
                      onChange={(e) => setRefHeight(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono text-slate-900 focus:ring-2 focus:ring-teal-600 outline-hidden"
                    />
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-teal-900 text-white">
                  <span className="text-[10px] font-bold text-teal-300 uppercase">Acuan Volume Bak</span>
                  <p className="font-mono font-black text-2xl mt-0.5">{formatVolumeM3(refVolumeM3)}</p>
                  <p className="text-[11px] text-teal-200 mt-1">
                    Estimasi Tonase ({products.find((p) => p.id === activeUnloadingDelivery?.productId)?.name || 'material agregat'}):{' '}
                    <span className="font-black text-amber-300">{formatWeightTon(Math.round(refTons * 1000))}</span>
                    <span className="opacity-80"> · Volume × Densitas {unloadingDensity.toFixed(2)} ton/m³</span>
                  </p>
                </div>
              </div>

              {/* Notes & Condition */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Catatan Kondisi Fisik Material Saat Pembongkaran:</label>
                <input
                  type="text"
                  value={siteConditionNotes}
                  onChange={(e) => setSiteConditionNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-600 outline-hidden"
                />
              </div>

              {/* E-Signature */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Tanda Tangan Petugas Site Proyek ({currentProfile.fullName}):</label>
                <SignaturePad onSave={(data) => setSiteSignature(data)} title="Tanda Tangan Penerima Site Proyek" />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveUnloadingDelivery(null)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-md font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-md font-bold flex items-center gap-1.5 shadow-2xs"
                >
                  <CheckCircle2 className="w-4 h-4" /> Terbitkan Bukti e-POD & Selesaikan Unloading
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
