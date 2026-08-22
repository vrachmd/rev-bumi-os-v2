import React, { useState } from 'react';
import { Truck, Scale, User, MapPin, Plus, DollarSign, CheckCircle2, Search, Pencil, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatIDR, formatVolumeM3 } from '../../lib/formatters';
import { FreightPricingModel, VendorSupplyType, FreightRate } from '../../types';

export const LogisticsView: React.FC = () => {
  const {
    transportVendors,
    vehicles,
    drivers,
    freightRates,
    quarries,
    projects,
    saveFreightRate,
    saveVendor,
    saveVehicle,
    saveDriver,
    deleteVendor,
    deleteVehicle,
    deleteDriver,
    deleteFreightRate,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'vendors' | 'vehicles' | 'drivers' | 'rates'>('rates');
  const [isAddingRate, setIsAddingRate] = useState(false);
  const [editingRateId, setEditingRateId] = useState<string | null>(null);

  // Vendor CRUD state
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [vendorName, setVendorName] = useState('');
  const [vendorPic, setVendorPic] = useState('');
  const [vendorPhone, setVendorPhone] = useState('');
  const [vendorPricingModel, setVendorPricingModel] = useState<FreightPricingModel>('PER_M3');
  const [vendorSupplyType, setVendorSupplyType] = useState<VendorSupplyType>('TRANSPORT_ONLY');
  const [vendorNotes, setVendorNotes] = useState('');

  // Vehicle CRUD state
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [vehicleVendorId, setVehicleVendorId] = useState(transportVendors[0]?.id || '');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [vehicleCapacity, setVehicleCapacity] = useState<number>(24);

  // Driver CRUD state
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [driverVendorId, setDriverVendorId] = useState(transportVendors[0]?.id || '');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [driverSim, setDriverSim] = useState('');

  // New Freight Rate form
  const [vendorId, setVendorId] = useState(transportVendors[0]?.id || '');
  const [quarryId, setQuarryId] = useState(quarries[0]?.id || '');
  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const [pricingModel, setPricingModel] = useState<FreightPricingModel>('PER_M3');
  const [ratePerUnit, setRatePerUnit] = useState<number>(65000);
  const [minCharge, setMinCharge] = useState<number>(0);
  const [distanceKm, setDistanceKm] = useState<number>(45);

  const openVendorModal = (vendor?: (typeof transportVendors)[number]) => {
    setEditingVendorId(vendor?.id ?? null);
    setVendorName(vendor?.name ?? '');
    setVendorPic(vendor?.contactPerson ?? '');
    setVendorPhone(vendor?.phone ?? '');
    setVendorPricingModel(vendor?.defaultPricingModel ?? 'PER_M3');
    setVendorSupplyType(vendor?.supplyType ?? 'TRANSPORT_ONLY');
    setVendorNotes(vendor?.notes ?? '');
    setIsVendorModalOpen(true);
  };

  const handleSaveVendor = (e: React.FormEvent) => {
    e.preventDefault();
    saveVendor({
      id: editingVendorId ?? `vendor-${Date.now()}`,
      name: vendorName,
      contactPerson: vendorPic,
      phone: vendorPhone,
      defaultPricingModel: vendorPricingModel,
      supplyType: vendorSupplyType,
      isActive: true,
      notes: vendorNotes || undefined,
    });
    setIsVendorModalOpen(false);
  };

  const openVehicleModal = (vehicle?: (typeof vehicles)[number]) => {
    setEditingVehicleId(vehicle?.id ?? null);
    setVehicleVendorId(vehicle?.transportVendorId ?? transportVendors[0]?.id ?? '');
    setVehiclePlate(vehicle?.plateNumber ?? '');
    setVehicleType(vehicle?.vehicleType ?? '');
    setVehicleCapacity(vehicle?.nominalCapacityM3 ?? 24);
    setIsVehicleModalOpen(true);
  };

  const handleSaveVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    saveVehicle({
      id: editingVehicleId ?? `veh-${Date.now()}`,
      transportVendorId: vehicleVendorId,
      plateNumber: vehiclePlate,
      vehicleType: vehicleType || 'Dump Truck Tronton 10 Roda',
      nominalCapacityM3: Number(vehicleCapacity),
      isActive: true,
      status: 'AVAILABLE',
      maxCapacityTons: Number(vehicleCapacity) * 1.6,
    });
    setIsVehicleModalOpen(false);
  };

  const openDriverModal = (driver?: (typeof drivers)[number]) => {
    setEditingDriverId(driver?.id ?? null);
    setDriverVendorId(driver?.transportVendorId ?? transportVendors[0]?.id ?? '');
    setDriverName(driver?.fullName ?? '');
    setDriverPhone(driver?.phone ?? '');
    setDriverSim(driver?.simNumber ?? '');
    setIsDriverModalOpen(true);
  };

  const handleSaveDriver = (e: React.FormEvent) => {
    e.preventDefault();
    saveDriver({
      id: editingDriverId ?? `drv-${Date.now()}`,
      transportVendorId: driverVendorId,
      fullName: driverName,
      phone: driverPhone,
      simNumber: driverSim || undefined,
      isActive: true,
      status: 'AVAILABLE',
    });
    setIsDriverModalOpen(false);
  };

  const openEditRate = (rate: FreightRate) => {
    setEditingRateId(rate.id);
    setVendorId(rate.transportVendorId);
    setQuarryId(rate.quarryId);
    setProjectId(rate.projectId);
    setPricingModel(rate.pricingModel);
    setRatePerUnit(rate.ratePerUnit);
    setMinCharge(rate.minimumChargeIdr ?? 0);
    setDistanceKm(rate.distanceKm ?? 45);
    setIsAddingRate(true);
  };

  const handleAddRate = (e: React.FormEvent) => {
    e.preventDefault();
    const isAllIn = pricingModel === 'ALL_IN';
    const id = editingRateId ?? `rate-${Date.now()}`;
    saveFreightRate({
      id,
      transportVendorId: vendorId,
      quarryId,
      projectId,
      pricingModel,
      ratePerUnit: Number(ratePerUnit),
      isAllInclusiveMaterial: isAllIn ? true : undefined,
      allInVolumeBasis: isAllIn ? 'PER_M3_RECEIVED' : undefined,
      ratePerUnitIdr: Number(ratePerUnit),
      minimumChargeIdr: Number(minCharge),
      distanceKm: Number(distanceKm),
      effectiveDate: new Date().toISOString(),
      isActive: true,
    });
    setIsAddingRate(false);
    setEditingRateId(null);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Sub Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('rates')}
          className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
            activeTab === 'rates'
              ? 'bg-[#003C16] text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Matrix Tarif Angkut / Freight Rates ({freightRates.length})
        </button>
        <button
          onClick={() => setActiveTab('vendors')}
          className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
            activeTab === 'vendors'
              ? 'bg-[#003C16] text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Vendor Transportasi ({transportVendors.length})
        </button>
        <button
          onClick={() => setActiveTab('vehicles')}
          className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
            activeTab === 'vehicles'
              ? 'bg-[#003C16] text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Armada Truk / Dump Truck ({vehicles.length})
        </button>
        <button
          onClick={() => setActiveTab('drivers')}
          className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
            activeTab === 'drivers'
              ? 'bg-[#003C16] text-white shadow-xs'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Pengemudi / Drivers ({drivers.length})
        </button>
      </div>

      {/* 1. Rates Matrix Tab */}
      {activeTab === 'rates' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Matrix & Rumus Ongkos Angkut (Freight Pricing Models)
              </h3>
              <p className="text-xs text-slate-500">
                Tarif disepakati per rute Quarry &rarr; Site Proyek dengan model PER_M3, PER_TON, PER_TRIP, atau ALL_IN (harga sudah termasuk material + angkut).
              </p>
            </div>
            <button
              onClick={() => {
                setEditingRateId(null);
                setVendorId(transportVendors[0]?.id || '');
                setQuarryId(quarries[0]?.id || '');
                setProjectId(projects[0]?.id || '');
                setPricingModel('PER_M3');
                setRatePerUnit(65000);
                setMinCharge(0);
                setDistanceKm(45);
                setIsAddingRate(true);
              }}
              className="px-3.5 py-2 rounded-md bg-[#003C16] hover:bg-[#002B10] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs"
            >
              <Plus className="w-4 h-4" /> Tambah Tarif Rute Baru
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3.5">Vendor Transportasi</th>
                    <th className="py-3 px-3">Quarry Asal</th>
                    <th className="py-3 px-3">Proyek Tujuan</th>
                    <th className="py-3 px-3 text-center">Jarak (Km)</th>
                    <th className="py-3 px-3">Model Tarif</th>
                    <th className="py-3 px-3 text-right">Tarif Dasar</th>
                    <th className="py-3 px-3 text-right">Min. Biaya</th>
                    <th className="py-3 px-2 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {freightRates.map((fr) => {
                    const vendor = transportVendors.find((v) => v.id === fr.transportVendorId);
                    const quarry = quarries.find((q) => q.id === fr.quarryId);
                    const proj = projects.find((p) => p.id === fr.projectId);

                    return (
                      <tr key={fr.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3.5 font-bold text-slate-900">
                          {vendor?.name}
                        </td>
                        <td className="py-3 px-3">{quarry?.name}</td>
                        <td className="py-3 px-3 font-semibold text-slate-800">{proj?.name}</td>
                        <td className="py-3 px-3 text-center font-mono">{fr.distanceKm || '-'} km</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            fr.pricingModel === 'ALL_IN'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {fr.pricingModel}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-emerald-800 text-sm">
                          {formatIDR(fr.ratePerUnitIdr ?? fr.ratePerUnit)}
                          <span className="text-[10px] text-slate-500 font-normal">
                            {' '}
                            / {fr.pricingModel === 'PER_M3' ? 'm³' : fr.pricingModel === 'PER_TON' ? 'ton' : fr.pricingModel === 'ALL_IN' ? 'm³ terima (all-in)' : 'rit'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-600">
                          {(fr.minimumChargeIdr ?? 0) > 0 ? formatIDR(fr.minimumChargeIdr!) : '-'}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openEditRate(fr)}
                              title="Edit tarif"
                              className="p-1.5 rounded text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Hapus tarif ${vendor?.name} ${quarry?.name} → ${proj?.name} (${fr.pricingModel})?`)) deleteFreightRate(fr.id);
                              }}
                              title="Hapus tarif"
                              className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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

      {/* 2. Transport Vendors Tab */}
      {activeTab === 'vendors' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Management Vendor Transportasi</h3>
              <p className="text-xs text-slate-500">
                Kelola vendor armada, tipe pasokan (all-in / angkut saja), dan data PIC.
              </p>
            </div>
            <button
              onClick={() => openVendorModal()}
              className="px-3.5 py-2 rounded-md bg-[#003C16] hover:bg-[#002B10] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs"
            >
              <Plus className="w-4 h-4" /> Tambah Vendor
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {transportVendors.map((v) => {
            const vendorVehicles = vehicles.filter((veh) => veh.transportVendorId === v.id);
            return (
              <div key={v.id} className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded bg-amber-50 text-amber-800">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{v.name}</h4>
                      <span className="text-[10px] text-slate-500 font-mono">Kode: {v.code ?? v.id}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openVendorModal(v)}
                      title="Edit vendor"
                      className="p-1.5 rounded text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteVendor(v.id)}
                      title="Hapus vendor"
                      className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {v.supplyType && (
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                    v.supplyType === 'MATERIAL_AND_TRANSPORT'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-sky-100 text-sky-800'
                  }`}>
                    {v.supplyType === 'MATERIAL_AND_TRANSPORT'
                      ? 'All-in (Material + Angkut)'
                      : 'Angkut Saja (Split)'}
                  </span>
                )}

                <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <p>PIC: <strong>{v.contactPerson}</strong></p>
                  <p>Telp: {v.phone}</p>
                  <p>Termin Tagihan: {v.paymentTermsDays} Hari</p>
                  <p>Model Bayar: <strong className="font-mono">{v.defaultPricingModel}</strong></p>
                  {v.notes && <p className="text-[11px] italic text-slate-500">{v.notes}</p>}
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500">Jumlah Armada:</span>
                  <span className="font-bold text-slate-900">{vendorVehicles.length} Unit Truk</span>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {/* 3. Fleet Vehicles Tab */}
      {activeTab === 'vehicles' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Management Armada Truk</h3>
              <p className="text-xs text-slate-500">
                Kelola kendaraan dump truck per vendor armada.
              </p>
            </div>
            <button
              onClick={() => openVehicleModal()}
              className="px-3.5 py-2 rounded-md bg-[#003C16] hover:bg-[#002B10] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs"
            >
              <Plus className="w-4 h-4" /> Tambah Armada
            </button>
          </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((veh) => {
            const vendor = transportVendors.find((v) => v.id === veh.transportVendorId);
            return (
              <div key={veh.id} className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-mono font-bold text-slate-900 text-base">{veh.plateNumber}</h4>
                    <p className="text-xs text-slate-500">{veh.vehicleType}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {veh.status ?? 'AVAILABLE'}
                    </span>
                    <button
                      onClick={() => openVehicleModal(veh)}
                      title="Edit armada"
                      className="p-1.5 rounded text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteVehicle(veh.id)}
                      title="Hapus armada"
                      className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs p-2.5 rounded bg-slate-50 border border-slate-100 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Kapasitas Nominal:</span>
                    <span className="font-bold text-slate-900">{veh.nominalCapacityM3} m³</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Kapasitas Max:</span>
                    <span className="font-bold text-slate-900">{veh.maxCapacityTons} Ton</span>
                  </div>
                </div>

                <div className="pt-1 text-xs text-slate-600 flex justify-between">
                  <span>Vendor:</span>
                  <strong className="text-slate-900">{vendor?.name}</strong>
                </div>
              </div>
            );
          })}
        </div>
        </div>
      )}

      {/* 4. Drivers Tab */}
      {activeTab === 'drivers' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Management Pengemudi</h3>
              <p className="text-xs text-slate-500">
                Kelola data supir di bawah vendor armada.
              </p>
            </div>
            <button
              onClick={() => openDriverModal()}
              className="px-3.5 py-2 rounded-md bg-[#003C16] hover:bg-[#002B10] text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs"
            >
              <Plus className="w-4 h-4" /> Tambah Pengemudi
            </button>
          </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {drivers.map((driver) => {
            const vendor = transportVendors.find((v) => v.id === driver.transportVendorId);
            return (
              <div key={driver.id} className="bg-white border border-slate-200 rounded-lg p-5 shadow-2xs space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700">
                      {driver.fullName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{driver.fullName}</h4>
                      <span className="text-[10px] text-slate-500 font-mono">SIM: {driver.simNumber}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {driver.status ?? 'AVAILABLE'}
                    </span>
                    <button
                      onClick={() => openDriverModal(driver)}
                      title="Edit pengemudi"
                      className="p-1.5 rounded text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteDriver(driver.id)}
                      title="Hapus pengemudi"
                      className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <p>No. Telepon: <strong>{driver.phone}</strong></p>
                  <p>Vendor: <strong>{vendor?.name}</strong></p>
                </div>
              </div>
            );
          })}
        </div>
        </div>
      )}

      {/* Modal Add Freight Rate */}
      {isAddingRate && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-3.5 bg-[#003C16] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider">
                Tambah Tarif Ongkos Angkut Rute
              </h3>
              <button onClick={() => setIsAddingRate(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddRate} className="p-5 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Vendor Transportasi *</label>
                <select
                  value={vendorId}
                  onChange={(e) => setVendorId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
                >
                  {transportVendors.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Quarry Asal *</label>
                  <select
                    value={quarryId}
                    onChange={(e) => setQuarryId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
                  >
                    {quarries.map((q) => (
                      <option key={q.id} value={q.id}>{q.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Proyek Tujuan *</label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Model Tarif *</label>
                  <select
                    value={pricingModel}
                    onChange={(e) => {
                      setPricingModel(e.target.value as FreightPricingModel);
                      if (e.target.value === 'ALL_IN') {
                        setRatePerUnit((prev) => (prev < 100000 ? 120000 : prev));
                      }
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden font-mono"
                  >
                    <option value="PER_M3">PER_M3 (Per m³)</option>
                    <option value="PER_TON">PER_TON (Per Ton)</option>
                    <option value="PER_TRIP">PER_TRIP (Per Rit Truk)</option>
                    <option value="ALL_IN">ALL_IN (Harga termasuk Material + Angkut)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Tarif (IDR) *</label>
                  <input
                    type="number"
                    step={1000}
                    required
                    value={ratePerUnit}
                    onChange={(e) => setRatePerUnit(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Jarak (Km)</label>
                  <input
                    type="number"
                    step={1}
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Min. Biaya (IDR)</label>
                  <input
                    type="number"
                    step={1000}
                    value={minCharge}
                    onChange={(e) => setMinCharge(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddingRate(false)}
                  className="px-3 py-2 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md text-xs font-bold text-white bg-[#003C16] hover:bg-[#002B10]"
                >
                  Simpan Tarif
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add/Edit Vendor */}
      {isVendorModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-3.5 bg-[#003C16] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider">
                {editingVendorId ? 'Edit Vendor Transportasi' : 'Tambah Vendor Transportasi'}
              </h3>
              <button onClick={() => setIsVendorModalOpen(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveVendor} className="p-5 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Nama Vendor *</label>
                <input
                  type="text"
                  required
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="Contoh: Armada Ivan Beton Supply"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">PIC / Kontak</label>
                  <input
                    type="text"
                    value={vendorPic}
                    onChange={(e) => setVendorPic(e.target.value)}
                    placeholder="Nama PIC"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">No. Telepon</label>
                  <input
                    type="text"
                    value={vendorPhone}
                    onChange={(e) => setVendorPhone(e.target.value)}
                    placeholder="+62 812 ..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Tipe Pasokan *</label>
                  <select
                    value={vendorSupplyType}
                    onChange={(e) => setVendorSupplyType(e.target.value as VendorSupplyType)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
                  >
                    <option value="TRANSPORT_ONLY">Angkut Saja (Split)</option>
                    <option value="MATERIAL_AND_TRANSPORT">All-in (Material + Angkut)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Model Bayar Default *</label>
                  <select
                    value={vendorPricingModel}
                    onChange={(e) => setVendorPricingModel(e.target.value as FreightPricingModel)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden font-mono"
                  >
                    <option value="PER_M3">PER_M3</option>
                    <option value="PER_TON">PER_TON</option>
                    <option value="PER_TRIP">PER_TRIP</option>
                    <option value="ALL_IN">ALL_IN</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Catatan</label>
                <textarea
                  value={vendorNotes}
                  onChange={(e) => setVendorNotes(e.target.value)}
                  rows={2}
                  placeholder="Catatan pembayaran / skema kerjasama"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsVendorModalOpen(false)}
                  className="px-3 py-2 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md text-xs font-bold text-white bg-[#003C16] hover:bg-[#002B10]"
                >
                  Simpan Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add/Edit Vehicle */}
      {isVehicleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-3.5 bg-[#003C16] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider">
                {editingVehicleId ? 'Edit Armada Truk' : 'Tambah Armada Truk'}
              </h3>
              <button onClick={() => setIsVehicleModalOpen(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveVehicle} className="p-5 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Vendor Armada *</label>
                <select
                  value={vehicleVendorId}
                  onChange={(e) => setVehicleVendorId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
                >
                  {transportVendors.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Nomor Plat *</label>
                <input
                  type="text"
                  required
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                  placeholder="Contoh: B 9123 IVX"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Tipe Kendaraan</label>
                <input
                  type="text"
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  placeholder="Dump Truck Tronton 10 Roda"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Kapasitas Nominal (m³) *</label>
                <input
                  type="number"
                  step={0.5}
                  required
                  min={1}
                  value={vehicleCapacity}
                  onChange={(e) => setVehicleCapacity(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsVehicleModalOpen(false)}
                  className="px-3 py-2 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md text-xs font-bold text-white bg-[#003C16] hover:bg-[#002B10]"
                >
                  Simpan Armada
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add/Edit Driver */}
      {isDriverModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-3.5 bg-[#003C16] text-white flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider">
                {editingDriverId ? 'Edit Pengemudi' : 'Tambah Pengemudi'}
              </h3>
              <button onClick={() => setIsDriverModalOpen(false)} className="text-white/80 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveDriver} className="p-5 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Vendor Armada *</label>
                <select
                  value={driverVendorId}
                  onChange={(e) => setDriverVendorId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
                >
                  {transportVendors.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Nama Lengkap *</label>
                  <input
                    type="text"
                    required
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">No. Telepon</label>
                  <input
                    type="text"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Nomor SIM</label>
                <input
                  type="text"
                  value={driverSim}
                  onChange={(e) => setDriverSim(e.target.value)}
                  placeholder="SIM B2 UMUM - 000000"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDriverModalOpen(false)}
                  className="px-3 py-2 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md text-xs font-bold text-white bg-[#003C16] hover:bg-[#002B10]"
                >
                  Simpan Pengemudi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
