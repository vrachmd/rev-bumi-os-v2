import React, { useState } from 'react';
import { FileCheck, X, CheckCircle2, MapPin, Camera, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Delivery } from '../../types';
import { SignaturePad } from '../common/SignaturePad';

interface PodModalProps {
  delivery: Delivery | null;
  onClose: () => void;
}

export const PodModal: React.FC<PodModalProps> = ({ delivery, onClose }) => {
  const { submitPod, drivers } = useApp();

  const [recipientName, setRecipientName] = useState<string>(
    delivery?.pod?.recipientName || 'Ir. Wahyu Pratama'
  );
  const [recipientRole, setRecipientRole] = useState<string>(
    delivery?.pod?.recipientRole || 'Site Engineer / Quantity Surveyor'
  );
  const [gpsLat, setGpsLat] = useState<number>(delivery?.pod?.gpsLatitude || -6.78912);
  const [gpsLng, setGpsLng] = useState<number>(delivery?.pod?.gpsLongitude || 108.01234);
  const [gpsAcc, setGpsAcc] = useState<number>(delivery?.pod?.gpsAccuracyMeters || 4.2);
  
  const [sigDispatcher, setSigDispatcher] = useState<string>(
    delivery?.pod?.signatureDispatcherUrl || 'signed:dispatcher_quarry'
  );
  const [sigDriver, setSigDriver] = useState<string>(
    delivery?.pod?.signatureDriverUrl || 'signed:driver_truck'
  );
  const [sigRecipient, setSigRecipient] = useState<string>(
    delivery?.pod?.signatureRecipientUrl || ''
  );

  const [deliverySlipPhoto, setDeliverySlipPhoto] = useState<string>(
    delivery?.pod?.deliverySlipPhotoUrl ||
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80'
  );
  const [materialPhoto, setMaterialPhoto] = useState<string>(
    delivery?.pod?.materialPhotoUrl ||
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=80'
  );
  const [notes, setNotes] = useState<string>(
    delivery?.pod?.notes || 'Material diperiksa pada lokasi proyek dan telah dibongkar sesuai instruksi site manager.'
  );

  const [isGettingGps, setIsGettingGps] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!delivery) return null;

  const driver = drivers.find((d) => d.id === delivery.driverId);

  const handleFetchGps = () => {
    if (!navigator.geolocation) {
      setError('Geolocation tidak didukung pada browser ini.');
      return;
    }
    setIsGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLat(pos.coords.latitude);
        setGpsLng(pos.coords.longitude);
        setGpsAcc(Math.round(pos.coords.accuracy));
        setIsGettingGps(false);
      },
      (err) => {
        setError(`Gagal membaca GPS: ${err.message}. Digunakan koordinat default site proyek.`);
        setIsGettingGps(false);
      },
      { timeout: 8000 }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientName) {
      setError('Nama penerima proyek wajib diisi.');
      return;
    }

    const res = submitPod(delivery.id, {
      recipientName,
      recipientRole,
      gpsLatitude: gpsLat,
      gpsLongitude: gpsLng,
      gpsAccuracyMeters: gpsAcc,
      signatureDispatcherUrl: sigDispatcher,
      signatureDriverUrl: sigDriver,
      signatureRecipientUrl: sigRecipient || 'signed:recipient_verified',
      deliverySlipPhotoUrl: deliverySlipPhoto,
      materialPhotoUrl: materialPhoto,
      notes,
    });

    if (res.success) {
      onClose();
    } else {
      setError(res.error || 'Gagal menyimpan POD');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-3.5 bg-[#003C16] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-emerald-300" />
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider">
                Digital Proof of Delivery (POD) & Triple-Party Signatures
              </h2>
              <p className="text-[11px] text-emerald-200/80 font-mono">
                {delivery.deliveryNumber}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-white/80 hover:text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Recipient Identity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Nama Penerima Proyek (Site Engineer) *
              </label>
              <input
                type="text"
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Jabatan / Peran Penerima
              </label>
              <input
                type="text"
                value={recipientRole}
                onChange={(e) => setRecipientRole(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
              />
            </div>
          </div>

          {/* GPS Geolocation Capture */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#003C16]" /> Geotag Koordinat Lokasi Proyek
              </span>
              <button
                type="button"
                onClick={handleFetchGps}
                disabled={isGettingGps}
                className="px-2.5 py-1 rounded bg-[#003C16] text-white text-[11px] font-semibold hover:bg-[#002B10] transition-colors"
              >
                {isGettingGps ? 'Membaca GPS...' : 'Ambil GPS Terkini'}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
              <div className="p-2 bg-white rounded border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Latitude:</span>
                <span className="font-bold text-slate-900">{gpsLat.toFixed(5)}</span>
              </div>
              <div className="p-2 bg-white rounded border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Longitude:</span>
                <span className="font-bold text-slate-900">{gpsLng.toFixed(5)}</span>
              </div>
              <div className="p-2 bg-white rounded border border-slate-200">
                <span className="text-[10px] text-slate-500 block">Akurasi:</span>
                <span className="font-bold text-emerald-800">±{gpsAcc} meter</span>
              </div>
            </div>
          </div>

          {/* Triple-Party Digital Signatures */}
          <div>
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-2">
              Pengesahan 3 Pihak (Triple-Party Signatures)
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <SignaturePad
                label="Pihak 1"
                signerTitle="Dispatcher Quarry"
                initialSignature={sigDispatcher}
                onSave={setSigDispatcher}
              />
              <SignaturePad
                label="Pihak 2"
                signerTitle={`Driver (${driver?.fullName || 'Pengemudi'})`}
                initialSignature={sigDriver}
                onSave={setSigDriver}
              />
              <SignaturePad
                label="Pihak 3"
                signerTitle={`Penerima (${recipientName})`}
                initialSignature={sigRecipient}
                onSave={setSigRecipient}
              />
            </div>
          </div>

          {/* Photos & Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Foto Surat Jalan Fisik (Tercap Lapangan)
              </label>
              <input
                type="text"
                value={deliverySlipPhoto}
                onChange={(e) => setDeliverySlipPhoto(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Foto Material Saat Unloading di Site
              </label>
              <input
                type="text"
                value={materialPhoto}
                onChange={(e) => setMaterialPhoto(e.target.value)}
                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Catatan Lapangan & Kondisi Material
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
              placeholder="Kondisi cuaca, akses jalan, atau catatan visual agregat..."
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-md text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md text-xs font-bold text-white bg-[#003C16] hover:bg-[#002B10] flex items-center gap-1.5 shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" /> Simpan & Ajukan Bukti POD
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
