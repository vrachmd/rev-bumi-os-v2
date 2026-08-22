// @ts-nocheck
import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Upload, Download, CheckCircle2, FileSpreadsheet, X, Loader2, Truck } from 'lucide-react';

const TEMPLATE_HEADERS = ['tanggal_muat','quarry','produk','plat_nomor','supir','vendor_armada','project_tujuan','metode','gross_kg','tare_kg','panjang_m','lebar_m','tinggi_m','sj_imci'];
const TEMPLATE_CSV = TEMPLATE_HEADERS.join(',') + '\n' + [
  '2026-08-22,Rumpin,Batu Split 1-2,B 9510 UYV,Ujang,Yudhi,KBS Bogor,PER_TRIP,25400,14200,,,101162',
  '2026-08-22,Rumpin,Batu Split 1-2,B 9420 FYU,Sutejo,Yudhi,KBS Bogor,PER_TRIP,,,,6.2,2.3,1.7,',
  '2026-08-22,Bojonegara,Abu Batu,B 9001 NDC,IVAN,IVAN,Karya Beton Dadap,ALL_IN,23000,13000,,,',
].join('\n');

export const BulkDeliveriesView: React.FC = () => {
  const app: any = useApp();
  const [rows, setRows] = useState<any[]>([]);
  const [fileName, setFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'bulk_ritase_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const parseCsv = (text: string) => {
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const out: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      const raw: Record<string,string> = {};
      headers.forEach((h, idx) => raw[h] = (cols[idx] ?? '').trim());
      out.push({ idx: i, raw, plat: raw['plat_nomor'] || raw['plat'] || '', quarryName: raw['quarry']||'', produkName: raw['produk']||'', vendorName: raw['vendor_armada']||'', projectName: raw['project_tujuan']||'', tanggal: raw['tanggal_muat']||'' });
    }
    return out;
  };

  const onFile = async (f: File) => {
    setFileName(f.name);
    setResult(null);
    const text = await f.text();
    if (f.name.endsWith('.xlsx') && !text.includes('tanggal_muat')) {
      alert('File .xlsx terdeteksi. Save As CSV dulu atau pakai template CSV.');
      return;
    }
    setRows(parseCsv(text));
  };

  const handleSubmit = async () => {
    if (rows.length === 0) { alert('Pilih file dulu'); return; }
    // validasi minimal di server: cukup mapping manual via AppContext bulkCreate — untuk versi minimal, kirim apa adanya dan biarkan server log error per baris
    const toCreate = rows.slice(0, 50).map((r: any) => {
      // cari ID master secara aman (tanpa vendor variable plain)
      const quarry = (app.quarries||[]).find((q:any)=> (q.name||'').toLowerCase().includes((r.quarryName||'').toLowerCase()));
      const product = (app.products||[]).find((p:any)=> (p.name||'').toLowerCase().includes((r.produkName||'').toLowerCase()));
      const vnd = (app.transportVendors||[]).find((v:any)=> (v.name||'').toLowerCase().includes((r.vendorName||'').toLowerCase()));
      const proj = (app.projects||[]).find((p:any)=> (p.name||'').toLowerCase().includes((r.projectName||'').toLowerCase()));
      const ctr = quarry && product && proj ? (app.contracts||[]).find((c:any)=> c.quarryId===quarry.id && c.productId===product.id && c.projectId===proj.id) : (app.contracts||[])[0];
      if (!quarry || !product || !vnd || !proj || !ctr) return null;
      return {
        quarryId: quarry.id,
        productId: product.id,
        transportVendorId: vnd.id,
        contractId: ctr.id,
        scheduledDate: r.tanggal || new Date().toISOString().slice(0,10),
        loadedVolumeM3: 15,
        loadedWeightKg: 24000,
        driverName: r.raw?.supir || 'Supir Vendor Armada',
        plateNumber: r.plat,
        notes: r.raw?.sj_imci ? `SJ IMCI ${r.raw.sj_imci}` : '',
      };
    }).filter(Boolean);
    if (toCreate.length===0) { alert('Tidak ada baris yang bisa dipetakan ke master (quarry/produk/vendor/project/kontrak). Cek nama di CSV sesuai master.'); return; }
    setIsSubmitting(true);
    try {
      const res: any = await app.bulkCreateDeliveries(toCreate as any);
      setResult({ ok: res.ok, failed: res.failed, batchId: res.batchId });
      if (res.failed.length===0) setRows([]);
    } catch (e:any) { alert(e.message||'Gagal bulk'); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#003C16] flex items-center justify-center"><Truck className="w-5 h-5 text-white" /></div>
          <div>
            <h1 className="text-lg font-black text-slate-800">Tambah Ritase Massal</h1>
            <p className="text-xs text-slate-500">Versi minimal — validasi aman, 6 metode tetap (ALL_IN/PER_TRIP primary)</p>
          </div>
        </div>
        <button onClick={downloadTemplate} className="px-3 py-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5"><Download className="w-4 h-4"/> Download Template CSV</button>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div onDragOver={(e)=>e.preventDefault()} onDrop={(e)=>{ e.preventDefault(); const f=e.dataTransfer.files[0]; if(f) onFile(f); }} className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-[#003C16]/40 transition-colors">
          <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300" />
          <p className="mt-2 text-sm font-semibold text-slate-700">Drag & drop file CSV di sini</p>
          <p className="text-xs text-slate-400">header wajib: {TEMPLATE_HEADERS.join(', ')}</p>
          <input ref={inputRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={(e)=>{ const f=e.target.files?.[0]; if(f) onFile(f); }} />
          <button onClick={()=>inputRef.current?.click()} className="mt-3 px-4 py-2 rounded-md bg-[#003C16] text-white text-xs font-bold flex items-center gap-1.5 mx-auto"><Upload className="w-4 h-4"/> Pilih File</button>
          {fileName && <p className="mt-2 text-xs text-slate-600 flex items-center justify-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600"/> {fileName} — {rows.length} baris</p>}
        </div>
        {rows.length>0 && (
          <div className="space-y-3">
            <div className="overflow-auto border rounded-lg max-h-[300px]">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 sticky top-0"><tr className="text-[11px] uppercase text-slate-500"><th className="py-2 px-2">#</th><th className="py-2 px-2">Tgl</th><th className="py-2 px-2">Plat</th><th className="py-2 px-2">Quarry→Project</th><th className="py-2 px-2">Produk</th><th className="py-2 px-2">Vendor</th></tr></thead>
                <tbody>{rows.slice(0,20).map((r:any,i:number)=>(<tr key={i} className="border-t"><td className="py-1.5 px-2">{r.idx}</td><td className="py-1.5 px-2">{r.tanggal||'-'}</td><td className="py-1.5 px-2 font-mono font-bold">{r.plat||'-'}</td><td className="py-1.5 px-2">{r.quarryName} → {r.projectName}</td><td className="py-1.5 px-2">{r.produkName}</td><td className="py-1.5 px-2">{r.vendorName}</td></tr>))}</tbody>
              </table>
            </div>
            <button onClick={handleSubmit} disabled={isSubmitting} className="px-4 py-2 rounded-md bg-[#003C16] text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50">{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>}{isSubmitting ? 'Import...' : `Import ${rows.length} Ritase`}</button>
            {result && <span className="ml-3 text-xs font-semibold text-emerald-700">Batch {result.batchId}: {result.ok} sukses {result.failed?.length? `, ${result.failed.length} gagal`:''}</span>}
          </div>
        )}
      </div>
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600">6 model tetap aktif: <b>ALL_IN</b> & <b>PER_TRIP</b> primary, <b>PER_M3/PER_TON/ROUTE_BASED/HYBRID</b> lain tetap.</div>
    </div>
  );
};
