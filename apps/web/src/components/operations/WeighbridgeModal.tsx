import React, { useState } from 'react';
import { Scale, X, CheckCircle2, AlertCircle, Camera } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Delivery } from '../../types';
import { formatWeightKg, formatVolumeM3 } from '../../lib/formatters';

interface WeighbridgeModalProps {
  delivery: Delivery | null;
  onClose: () => void;
}

export const WeighbridgeModal: React.FC<WeighbridgeModalProps> = ({
  delivery,
  onClose,
}) => {
  const { submitWeighbridge, products, vehicles } = useApp();

  const [grossKg, setGrossKg] = useState<number>(delivery?.weighbridge?.grossWeightKg || 50000);
  const [tareKg, setTareKg] = useState<number>(delivery?.weighbridge?.tareWeightKg || 12000);
  const [photoUrl, setPhotoUrl] = useState<string>(
    delivery?.weighbridge?.scaleSlipPhotoUrl ||
      'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80'
  );
  const [error, setError] = useState<string | null>(null);

  if (!delivery) return null;

  const product = products.find((p) => p.id === delivery.productId);
  const vehicle = vehicles.find((v) => v.id === delivery.vehicleId);

  const netKg = Math.max(0, grossKg - tareKg);
  const density = delivery.densityApplied || product?.density || 1.60;
  const calculatedVolumeM3 = density > 0 ? (netKg / 1000) / density : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (grossKg < tareKg) {
      setError('Gross Weight (berat kotor) harus lebih besar atau sama dengan Tare Weight (berat kosong).');
      return;
    }

    const res = submitWeighbridge(delivery.id, grossKg, tareKg, photoUrl);
    if (res.success) {
      onClose();
    } else {
      setError(res.error || 'Gagal menyimpan data jembatan timbang');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#003C16] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-emerald-300" />
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider">
                Catat Jembatan Timbang Quarry
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 rounded bg-slate-50 border border-slate-200 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Material & Densitas:</span>
              <span className="font-bold text-slate-800">{product?.name} ({density.toFixed(2)} ton/m³)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Kendaraan Truk:</span>
              <span className="font-mono font-semibold text-slate-800">{vehicle?.plateNumber}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Gross Weight (Kg) *
              </label>
              <input
                type="number"
                required
                min={0}
                step={10}
                value={grossKg}
                onChange={(e) => setGrossKg(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono font-bold border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Berat Truk + Muatan</span>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Tare Weight (Kg) *
              </label>
              <input
                type="number"
                required
                min={0}
                step={10}
                value={tareKg}
                onChange={(e) => setTareKg(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono font-bold border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Berat Kosong Truk</span>
            </div>
          </div>

          {/* Calculated Net Weight Display */}
          <div className="p-3.5 rounded-lg bg-emerald-50/80 border border-emerald-200 text-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-emerald-900">Net Weight Bersih:</span>
              <span className="text-base font-extrabold text-emerald-950 font-mono">
                {formatWeightKg(netKg)} ({ (netKg / 1000).toFixed(2) } ton)
              </span>
            </div>
            <div className="flex items-center justify-between pt-1.5 border-t border-emerald-200/60">
              <span className="text-slate-600">Konversi Volume Equivalen:</span>
              <span className="font-bold text-[#003C16] font-mono text-sm">
                {formatVolumeM3(calculatedVolumeM3)}
              </span>
            </div>
          </div>

          {/* Photo URL */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Foto Bukti Tiket Timbang (Supabase Storage URL)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-[#003C16] outline-hidden font-mono"
              />
              <span className="p-2 rounded bg-slate-100 text-slate-600">
                <Camera className="w-4 h-4" />
              </span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
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
              <CheckCircle2 className="w-4 h-4" /> Simpan Data Timbangan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
