import React from 'react';
import { Printer, X, Download, QrCode, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Delivery } from '../../types';
import { formatDate, formatDateTime, formatIDR, formatVolumeM3, formatWeightKg } from '../../lib/formatters';

interface SuratJalanPrintModalProps {
  delivery: Delivery | null;
  onClose: () => void;
}

export const SuratJalanPrintModal: React.FC<SuratJalanPrintModalProps> = ({
  delivery,
  onClose,
}) => {
  const { company, products, quarries, customers, projects, contracts, transportVendors, vehicles, drivers } = useApp();

  if (!delivery) return null;

  const product = products.find((p) => p.id === delivery.productId);
  const quarry = quarries.find((q) => q.id === delivery.quarryId);
  const contract = contracts.find((c) => c.id === delivery.contractId);
  const customer = customers.find((c) => c.id === contract?.customerId);
  const project = projects.find((p) => p.id === contract?.projectId);
  const vendor = transportVendors.find((v) => v.id === delivery.transportVendorId);
  const vehicle = vehicles.find((v) => v.id === delivery.vehicleId);
  const driver = drivers.find((d) => d.id === delivery.driverId);
  const wb = delivery.weighbridge;
  const pod = delivery.pod;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      {/* Container */}
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Action Bar (No Print) */}
        <div className="px-6 py-3 bg-slate-900 text-white flex items-center justify-between no-print shrink-0">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Pratinjau Dokumen Resmi Surat Jalan / Delivery Order
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" /> Cetak / Unduh PDF (A4)
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable A4 Body */}
        <div className="flex-1 overflow-y-auto p-8 bg-white text-slate-900 font-sans" id="surat-jalan-a4">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-[#003C16] flex items-center justify-center text-white font-extrabold text-xl shadow-xs">
                RBN
              </div>
              <div>
                <h1 className="text-base font-black tracking-tight text-[#003C16] uppercase">
                  {company.name}
                </h1>
                <p className="text-[11px] text-slate-600 font-medium max-w-md">
                  {company.address}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Telp: {company.phone} | Email: {company.email}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block px-2.5 py-1 rounded bg-slate-900 text-white font-black text-xs uppercase tracking-widest">
                SURAT JALAN / DO
              </span>
              <p className="text-sm font-black text-slate-900 font-mono mt-1">
                {delivery.deliveryNumber}
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Tanggal: {formatDate(delivery.scheduledDate)}
              </p>
            </div>
          </div>

          {/* Recipient & Logistics Metadata Grid */}
          <div className="grid grid-cols-2 gap-6 my-4 p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            {/* Left: Customer & Project */}
            <div className="space-y-1.5">
              <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px] block border-b border-slate-200 pb-1">
                Tujuan Pengiriman & Proyek
              </span>
              <div className="flex justify-between">
                <span className="text-slate-500">Pelanggan:</span>
                <span className="font-bold text-slate-900 text-right">{customer?.name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Proyek:</span>
                <span className="font-semibold text-slate-800 text-right">{project?.name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Lokasi Site:</span>
                <span className="text-slate-700 text-right">{project?.location || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">No. Kontrak:</span>
                <span className="font-mono font-medium text-slate-800">{contract?.contractNumber || '-'}</span>
              </div>
            </div>

            {/* Right: Quarry & Transport */}
            <div className="space-y-1.5">
              <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px] block border-b border-slate-200 pb-1">
                Asal Muatan & Armada Angkutan
              </span>
              <div className="flex justify-between">
                <span className="text-slate-500">Quarry Asal:</span>
                <span className="font-bold text-slate-900">{quarry?.name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Vendor Angkutan:</span>
                <span className="font-semibold text-slate-800">{vendor?.name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">No. Polisi Truk:</span>
                <span className="font-mono font-bold text-slate-900">{vehicle?.plateNumber || '-'} ({vehicle?.vehicleType || ''})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nama Pengemudi:</span>
                <span className="font-medium text-slate-800">{driver?.fullName || '-'}</span>
              </div>
            </div>
          </div>

          {/* Material & Quantity Specification Table */}
          <div className="my-4">
            <table className="w-full text-left text-xs border border-slate-300">
              <thead className="bg-slate-800 text-white font-bold">
                <tr>
                  <th className="py-2 px-3 border border-slate-300">No</th>
                  <th className="py-2 px-3 border border-slate-300">Deskripsi Material & Spesifikasi</th>
                  <th className="py-2 px-3 border border-slate-300 text-center">Densitas</th>
                  <th className="py-2 px-3 border border-slate-300 text-right">Volume Muat (m³)</th>
                  <th className="py-2 px-3 border border-slate-300 text-right">Volume Diterima (m³)</th>
                  <th className="py-2 px-3 border border-slate-300 text-right">Volume Disetujui (m³)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-3 px-3 border border-slate-300 font-mono text-center">1</td>
                  <td className="py-3 px-3 border border-slate-300">
                    <p className="font-bold text-slate-900 text-sm">{product?.name}</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">{product?.qualitySpec}</p>
                    {product?.abrasionSpec && (
                      <p className="text-[10px] text-slate-500">Abrasi: {product.abrasionSpec}</p>
                    )}
                  </td>
                  <td className="py-3 px-3 border border-slate-300 text-center font-mono font-medium">
                    {(delivery.densityApplied ?? 1.6).toFixed(2)} ton/m³
                  </td>
                  <td className="py-3 px-3 border border-slate-300 text-right font-mono font-bold text-sm">
                    {formatVolumeM3(delivery.loadedVolumeM3, false)} m³
                  </td>
                  <td className="py-3 px-3 border border-slate-300 text-right font-mono font-semibold">
                    {delivery.receivedVolumeM3 > 0 ? `${formatVolumeM3(delivery.receivedVolumeM3, false)} m³` : '-'}
                  </td>
                  <td className="py-3 px-3 border border-slate-300 text-right font-mono font-black text-sm text-[#003C16]">
                    {delivery.approvedVolumeM3 > 0 ? `${formatVolumeM3(delivery.approvedVolumeM3, false)} m³` : '-'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Weighbridge Details If Available */}
          {wb && (
            <div className="my-3 p-3 rounded bg-slate-50 border border-slate-200 text-xs">
              <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px] block mb-1">
                Data Jembatan Timbang Quarry (Weighbridge Scale)
              </span>
              <div className="grid grid-cols-4 gap-2 text-center font-mono">
                <div className="p-1.5 bg-white border border-slate-200 rounded">
                  <span className="text-[10px] text-slate-500 block">Gross Weight:</span>
                  <span className="font-bold text-slate-900">{formatWeightKg(wb.grossWeightKg)}</span>
                </div>
                <div className="p-1.5 bg-white border border-slate-200 rounded">
                  <span className="text-[10px] text-slate-500 block">Tare Weight:</span>
                  <span className="font-bold text-slate-900">{formatWeightKg(wb.tareWeightKg)}</span>
                </div>
                <div className="p-1.5 bg-white border border-slate-200 rounded">
                  <span className="text-[10px] text-slate-500 block">Net Weight:</span>
                  <span className="font-bold text-emerald-800">{formatWeightKg(wb.netWeightKg)}</span>
                </div>
                <div className="p-1.5 bg-white border border-slate-200 rounded">
                  <span className="text-[10px] text-slate-500 block">Calculated Eqv:</span>
                  <span className="font-bold text-slate-900">
                    {formatVolumeM3((wb.netWeightKg / 1000) / (delivery.densityApplied ?? 1.6), false)} m³
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Notes & Geolocation */}
          <div className="my-3 text-xs text-slate-600 space-y-1">
            <p>
              <strong className="text-slate-800">Catatan Khusus:</strong> {pod?.notes || 'Material diperiksa dan diterima dalam kondisi baik.'}
            </p>
            {pod?.gpsLatitude && (
              <p className="text-[10px] text-slate-500 font-mono">
                Geotag Koordinat POD: {pod.gpsLatitude.toFixed(5)}, {pod.gpsLongitude?.toFixed(5)} (Akurasi: ±{pod.gpsAccuracyMeters}m)
              </p>
            )}
          </div>

          {/* Triple-Party Signatures Block */}
          <div className="mt-8 pt-4 border-t-2 border-slate-900">
            <div className="grid grid-cols-3 gap-6 text-center text-xs">
              {/* Dispatcher */}
              <div className="flex flex-col items-center justify-between h-28 p-2 border border-slate-200 rounded bg-slate-50/50">
                <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                  1. Dispatcher Quarry
                </span>
                {pod?.signatureDispatcherUrl ? (
                  <div className="h-10 flex items-center justify-center">
                    <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                      TERTANDATANGANI SECARA DIGITAL
                    </span>
                  </div>
                ) : (
                  <div className="h-10"></div>
                )}
                <span className="text-slate-700 font-semibold border-t border-slate-400 w-4/5 pt-1">
                  ( Ahmad Supardi )
                </span>
              </div>

              {/* Driver */}
              <div className="flex flex-col items-center justify-between h-28 p-2 border border-slate-200 rounded bg-slate-50/50">
                <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                  2. Pengemudi / Driver
                </span>
                {pod?.signatureDriverUrl ? (
                  <div className="h-10 flex items-center justify-center">
                    <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                      TERTANDATANGANI SECARA DIGITAL
                    </span>
                  </div>
                ) : (
                  <div className="h-10"></div>
                )}
                <span className="text-slate-700 font-semibold border-t border-slate-400 w-4/5 pt-1">
                  ( {driver?.fullName || 'Pengemudi Truk'} )
                </span>
              </div>

              {/* Recipient */}
              <div className="flex flex-col items-center justify-between h-28 p-2 border border-slate-200 rounded bg-slate-50/50">
                <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                  3. Penerima Proyek
                </span>
                {pod?.signatureRecipientUrl ? (
                  <div className="h-10 flex items-center justify-center">
                    <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                      TERTANDATANGANI SECARA DIGITAL
                    </span>
                  </div>
                ) : (
                  <div className="h-10"></div>
                )}
                <span className="text-slate-700 font-semibold border-t border-slate-400 w-4/5 pt-1">
                  ( {pod?.recipientName || 'Site Engineer / QS'} )
                </span>
              </div>
            </div>
          </div>

          {/* Document Footer */}
          <div className="mt-6 pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
            <span>REV Bumi OS — Dokumen Operasional Sah PT REV Bumi Nusantara Perkasa</span>
            <span>Dicetak Otomatis pada {new Date().toLocaleString('id-ID')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
