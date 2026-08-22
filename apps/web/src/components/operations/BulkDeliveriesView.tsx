// @ts-nocheck
import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Upload, Download, CheckCircle2, AlertTriangle, FileSpreadsheet, X, Loader2, Truck } from 'lucide-react';
const calculateFreightCost = (model: string, rate: number, vol: number, ton: number, trip: number) => {
  if (model === 'PER_TRIP') return rate * trip;
  if (model === 'PER_M3') return rate * vol;
  if (model === 'PER_TON') return rate * ton;
  if (model === 'ALL_IN') return 0;
  return 0;
};

type ParsedRow = {
  idx: number;
  raw: Record<string, string>;
  tanggal_muat?: string;
  quarryName?: string;
  produkName?: string;
  plat?: string;
  supir?: string;
  vendorName?: string;
  projectName?: string;
  metode?: string;
  gross?: number;
  tare?: number;
  p?: number; l?: number; t?: number;
  sj_imci?: string;
};

const TEMPLATE_HEADERS = ['tanggal_muat','quarry','produk','plat_nomor','supir','vendor_armada','project_tujuan','metode','gross_kg','tare_kg','panjang_m','lebar_m','tinggi_m','sj_imci'];
const TEMPLATE_CSV = TEMPLATE_HEADERS.join(',') + '\n' + [
  '2026-08-22,Rumpin,Batu Split 1-2,B 9510 UYV,Ujang,Yudhi,KBS Bogor,PER_TRIP,25400,14200,,,101162',
  '2026-08-22,Rumpin,Batu Split 1-2,B 9420 FYU,Sutejo,Yudhi,KBS Bogor,PER_TRIP,,,,6.2,2.3,1.7,',
  '2026-08-22,Bojonegara,Abu Batu,B 9001 NDC,IVAN,IVAN,Karya Beton Dadap,ALL_IN,23000,13000,,,',
].join('\n');

function parseCsv(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const raw: Record<string,string> = {};
    headers.forEach((h, idx) => raw[h] = (cols[idx] ?? '').trim());
    rows.push({
      idx: i,
      raw,
      tanggal_muat: raw['tanggal_muat'] || raw['tanggal'] || '',
      quarryName: raw['quarry'] || '',
      produkName: raw['produk'] || raw['product'] || '',
      plat: raw['plat_nomor'] || raw['plat'] || '',
      supir: raw['supir'] || raw['driver'] || '',
      vendorName: raw['vendor_armada'] || raw['vendor'] || '',
      projectName: raw['project_tujuan'] || raw['project'] || '',
      metode: (raw['metode'] || '').toUpperCase(),
      gross: Number(raw['gross_kg'] || raw['gross'] || 0) || undefined,
      tare: Number(raw['tare_kg'] || raw['tare'] || 0) || undefined,
      p: Number(raw['panjang_m'] || raw['panjang'] || 0) || undefined,
      l: Number(raw['lebar_m'] || raw['lebar'] || 0) || undefined,
      t: Number(raw['tinggi_m'] || raw['tinggi'] || 0) || undefined,
      sj_imci: raw['sj_imci'] || '',
    });
  }
  return rows;
}

export const BulkDeliveriesView: React.FC = () => {
  const { quarries, products, transportVendors, projects, contracts, quarryMaterialCosts, freightRates, bulkCreateDeliveries } = useApp() as any;
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: number; failed: any[]; batchId: string } | null>(null);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'bulk_ritase_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const onFile = async (f: File) => {
    setFileName(f.name);
    setResult(null);
    const text = await f.text();
    // simple: if xlsx binary, text will be garbled -> show hint
    if (f.name.endsWith('.xlsx')) {
      // try csv fallback: if not csv, warn
      if (!text.includes('tanggal_muat') && !text.includes('quarry')) {
        alert('File .xlsx terdeteksi. Silakan Save As CSV dulu atau pakai template CSV. Dukungan .xlsx native menyusul.');
        return;
      }
    }
    const parsed = parseCsv(text);
    setRows(parsed);
  };

  const validation = useMemo(() => {
    const safe = (arr:any) => Array.isArray(arr) ? arr : [];
    return rows.map(r => {
      try {
        const quarry = safe(quarries).find((q:any) => (q.name||'').toLowerCase().includes((r.quarryName||'').toLowerCase()) || (q.code||'').toLowerCase()=== (r.quarryName||'').toLowerCase());
        const product = safe(products).find((p:any) => (p.name||'').toLowerCase().includes((r.produkName||'').toLowerCase()) || (p.code||'').toLowerCase()===(r.produkName||'').toLowerCase());
        const vendor = safe(transportVendors).find((v:any) => (v.name||'').toLowerCase().includes((r.vendorName||'').toLowerCase()) || (v.code||'').toLowerCase()===(r.vendorName||'').toLowerCase());
        const project = safe(projects).find((p:any) => (p.name||'').toLowerCase().includes((r.projectName||'').toLowerCase()));
        const contract = (quarry && product && project) ? safe(contracts).find((c:any) => c.quarryId===quarry.id && c.productId===product.id && c.projectId===project.id) || safe(contracts).find((c:any)=>c.productId===product.id && c.projectId===project.id) : null;
        const qmc = safe(quarryMaterialCosts).find((q:any)=> (q.quarry_id||q.quarryId)===quarry?.id && (q.product_id||q.productId)===product?.id);
        const density = (qmc?.density as number) || (product?.density as number) || 1.6;
        let vol = 0;
        if (r.gross && r.tare) vol = Math.max(0, (r.gross - r.tare)/1000 / density);
        else if (r.p && r.l && r.t) vol = r.p * r.l * r.t;
        const frate = (vendor && quarry && project) ? safe(freightRates).find((f:any)=>f.transportVendorId===vendor.id && f.quarryId===quarry.id && f.projectId===project.id && (f.isActive!==false)) : null;
        const metode = r.metode || frate?.pricingModel || vendor?.defaultPricingModel || 'PER_TRIP';
        let ongkos = 0;
        if (frate) {
          try { ongkos = calculateFreightCost(frate.pricingModel, Number(frate.ratePerUnit), vol, (r.gross&&r.tare? (r.gross-r.tare)/1000: vol*density), 1); } catch { ongkos=0; }
        }
        const errors: string[] = [];
        if (!r.plat) errors.push('plat kosong');
        if (!quarry) errors.push('quarry tidak ketemu');
        if (!product) errors.push('produk tidak ketemu');
        if (!vendor) errors.push('vendor tidak ketemu');
        if (!project) errors.push('project tidak ketemu');
        if (!contract) errors.push('kontrak tidak ketemu');
        if (vol<=0) errors.push('vol 0 (gross/tare atau PxLxT)');
        const isValid = errors.length===0;
        return { quarry, product, vendor, project, contract, vol, ongkos, frate, metode, errors, isValid, density };
      } catch (e:any) {
        return { quarry: null, product: null, vendor: null, project: null, contract: null, vol: 0, ongkos: 0, frate: null, metode: 'PER_TRIP', errors: ['validasi error: '+(e?.message||'unknown')], isValid: false, density: 1.6 };
      }
    });
  }, [rows, quarries, products, transportVendors, projects, contracts, quarryMaterialCosts, freightRates]);

  const validCount = validation.filter(v=>v.isValid).length;
  const invalidCount = validation.length - validCount;

  const handleSubmit = async () => {
    const toCreate = rows.filter((_, i)=> validation[i].isValid).map((r, i) => {
      const idx = rows.indexOf(r);
      const v = validation[idx];
      return {
        quarryId: v.quarry.id,
        productId: v.product.id,
        transportVendorId: v.vendor.id,
        contractId: v.contract?.id,
        scheduledDate: r.tanggal_muat || new Date().toISOString().slice(0,10),
        loadedVolumeM3: Number(v.vol.toFixed(3)),
        loadedWeightKg: r.gross && r.tare ? r.gross - r.tare : Math.round(v.vol * v.density * 1000),
        densityApplied: v.density,
        driverName: r.supir || 'Supir Vendor Armada',
        plateNumber: r.plat,
        notes: r.sj_imci ? `SJ IMCI ${r.sj_imci}` : '',
        measurementMode: r.gross && r.tare ? 'CALCULATED_FROM_WEIGHT' : 'ACTUAL_MEASURED',
        quarryLoadingInfo: r.gross && r.tare ? { measurementMethod: 'WEIGHBRIDGE', grossWeightKg: r.gross, tareWeightKg: r.tare, netWeightKg: r.gross - r.tare, densityUsed: v.density } as any : { measurementMethod: 'TRUCK_BED_VOLUME', truckBedDimensions: { lengthM: r.p||6.2, widthM: r.l||2.3, heightM: r.t||1.5, calculatedM3: v.vol } } as any,
      };
    });
    if (toCreate.length===0) { alert('Tidak ada baris valid'); return; }
    setIsSubmitting(true);
    setProgress(10);
    try {
      const res: any = await bulkCreateDeliveries(toCreate as any);
      setProgress(100);
      setResult({ ok: res.ok, failed: res.failed, batchId: res.batchId });
      if (res.failed.length===0) setRows([]);
    } catch (e:any) {
      alert(e.message || 'Gagal bulk');
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportErrors = () => {
    const bad = validation.map((v,i)=> ({ row: rows[i], v })).filter(x=>!x.v.isValid);
    if (bad.length===0) return;
    const headers = ['baris','plat','quarry','produk','vendor','project','error'];
    const csv = [headers.join(',')].concat(bad.map(b => [b.row.idx, b.row.plat, b.row.quarryName, b.row.produkName, b.row.vendorName, b.row.projectName, `"${b.v.errors.join('; ')}"`].join(','))).join('\n');
    const blob = new Blob([csv], {type:'text/csv'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='bulk_error.csv'; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#003C16] flex items-center justify-center"><Truck className="w-5 h-5 text-white" /></div>
          <div>
            <h1 className="text-lg font-black text-slate-800">Tambah Ritase Massal</h1>
            <p className="text-xs text-slate-500">Import CSV/XLSX — 6 metode tetap (ALL_IN/PER_TRIP primary) — batch 50 chunk</p>
          </div>
        </div>
        <button onClick={downloadTemplate} className="px-3 py-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5"><Download className="w-4 h-4"/> Download Template CSV</button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div
          onDragOver={(e)=>e.preventDefault()}
          onDrop={(e)=>{ e.preventDefault(); const f=e.dataTransfer.files[0]; if(f) onFile(f); }}
          className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-[#003C16]/40 transition-colors"
        >
          <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300" />
          <p className="mt-2 text-sm font-semibold text-slate-700">Drag & drop file CSV/XLSX di sini</p>
          <p className="text-xs text-slate-400">atau klik pilih file — header wajib: {TEMPLATE_HEADERS.join(', ')}</p>
          <input ref={inputRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={(e)=>{ const f=e.target.files?.[0]; if(f) onFile(f); }} />
          <button onClick={()=>inputRef.current?.click()} className="mt-3 px-4 py-2 rounded-md bg-[#003C16] text-white text-xs font-bold flex items-center gap-1.5 mx-auto"><Upload className="w-4 h-4"/> Pilih File</button>
          {fileName && <p className="mt-2 text-xs text-slate-600 flex items-center justify-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600"/> {fileName} — {rows.length} baris</p>}
        </div>

        {rows.length>0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">{validCount} valid</span>
              <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-bold">{invalidCount} error</span>
              <span className="text-slate-500">preview 20 baris</span>
              <button onClick={exportErrors} disabled={invalidCount===0} className="ml-auto px-2.5 py-1 rounded border text-xs disabled:opacity-50">Export error.csv</button>
              <button onClick={()=>{setRows([]); setFileName(''); setResult(null);}} className="px-2.5 py-1 rounded border"><X className="w-3 h-3 inline"/> Clear</button>
            </div>

            <div className="overflow-auto border rounded-lg max-h-[420px]">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr className="text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="py-2 px-2 text-left">#</th>
                    <th className="py-2 px-2 text-left">Tgl</th>
                    <th className="py-2 px-2 text-left">Plat</th>
                    <th className="py-2 px-2 text-left">Quarry→Project</th>
                    <th className="py-2 px-2 text-left">Produk</th>
                    <th className="py-2 px-2 text-left">Metode</th>
                    <th className="py-2 px-2 text-right">Vol m³</th>
                    <th className="py-2 px-2 text-right">Ongkos</th>
                    <th className="py-2 px-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0,20).map((r,i)=>{
                    const v = validation[i];
                    return (
                      <tr key={i} className={`border-t ${v.isValid?'bg-white':'bg-rose-50/60'}`}>
                        <td className="py-1.5 px-2">{r.idx}</td>
                        <td className="py-1.5 px-2">{r.tanggal_muat || '-'}</td>
                        <td className="py-1.5 px-2 font-mono font-bold">{r.plat || '-'}</td>
                        <td className="py-1.5 px-2">{r.quarryName} → {r.projectName}<div className="text-[11px] text-slate-500">{r.vendorName}</div></td>
                        <td className="py-1.5 px-2">{r.produkName}</td>
                        <td className="py-1.5 px-2"><span className={`px-1.5 py-0.5 rounded text-[11px] font-bold border ${v.metode==='ALL_IN'?'bg-emerald-50 text-emerald-700 border-emerald-200': v.metode==='PER_TRIP'?'bg-blue-50 text-blue-700 border-blue-200':'bg-amber-50 text-amber-700 border-amber-200'}`}>{v.metode}</span></td>
                        <td className="py-1.5 px-2 text-right font-mono">{v.vol.toFixed(2)}</td>
                        <td className="py-1.5 px-2 text-right font-mono">{v.ongkos? `Rp ${v.ongkos.toLocaleString('id-ID')}` : '-'}</td>
                        <td className="py-1.5 px-2">{v.isValid ? <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5"/> OK</span> : <span className="text-rose-600 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5"/> {v.errors.join('; ')}</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={handleSubmit} disabled={isSubmitting || validCount===0} className="px-4 py-2 rounded-md bg-[#003C16] text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>}
                {isSubmitting ? `Import ${progress}%` : `Import ${validCount} Ritase Valid`}
              </button>
              {result && (
                <span className={`text-xs font-semibold ${result.failed.length===0?'text-emerald-700':'text-amber-700'}`}>
                  Batch {result.batchId}: {result.ok} sukses {result.failed.length? `, ${result.failed.length} gagal`:''}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600">
        <p className="font-bold text-slate-700">Catatan metode pembayaran vendor</p>
        <p>6 model tetap aktif: <b>ALL_IN</b> & <b>PER_TRIP</b> primary (chip hijau/biru), <b>PER_M3/PER_TON/ROUTE_BASED/HYBRID</b> di `Lainnya`. Rate diambil dari `freight_rates {vendor,quarry,project}`; jika `metode` kosong, auto dari `frate` / `vendor.defaultPricingModel`.</p>
      </div>
    </div>
  );
};
