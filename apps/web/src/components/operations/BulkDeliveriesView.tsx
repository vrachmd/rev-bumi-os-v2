// @ts-nocheck
import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { Upload, Download, CheckCircle2, FileSpreadsheet, X, Loader2, Truck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

const TEMPLATE_HEADERS = ['tanggal_muat','plat_nomor','sj_imci','panjang_m','lebar_m','tinggi_m','m3_otomatis','project_tujuan','produk','quarry','metode','gross_kg','tare_kg','supir','vendor_armada','status'];
const TEMPLATE_CSV = TEMPLATE_HEADERS.join(',') + '\n' + [
  '2026-08-22,B 9553 UIU,101162,6.2,2.3,1.7,24.24,KBS Bogor,Batu Split 1-2,Rumpin,PER_TRIP,25400,14200,Ujang,Yudhi,DELIVERED',
  '2026-08-22,B 9420 FYU,,6.2,2.3,1.7,24.24,KBS Bogor,Batu Split 1-2,Rumpin,PER_TRIP,,,Sutejo,Yudhi,SCHEDULED',
  '2026-08-22,B 9001 NDC,,6.2,2.3,1.6,22.94,Karya Beton Dadap,Abu Batu,Bojonegara,ALL_IN,23000,13000,IVAN,IVAN,DELIVERED',
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
      headers.forEach((h, idx) => raw[h] = (cols[idx] || '').trim());
      out.push({ idx: i, raw, plat: raw['plat_nomor'] || raw['plat'] || '', quarryName: raw['quarry']||'', produkName: raw['produk']||'', vendorName: raw['vendor_armada']||'', projectName: raw['project_tujuan']||'', tanggal: raw['tanggal_muat']||'', statusRaw: (raw['status']||'SCHEDULED').toUpperCase() });
    }
    return out;
  };

  const onFile = async (f: File) => {
    setFileName(f.name);
    setResult(null);
    const text = await f.text();
    if (f.name.endsWith('.xlsx') && !text.includes('tanggal_muat')) {
      toast.error('File .xlsx terdeteksi. Save As CSV dulu atau pakai template CSV.');
      return;
    }
    setRows(parseCsv(text));
  };

  const handleSubmit = async () => {
    if (rows.length === 0) { toast.error('Pilih file dulu'); return; }
    // fallback ID jika master belum load / nama tidak exact
    const fallback = {
      quarry: { 'rampin':'quarry-01','rumpin':'quarry-01','sudamanik':'quarry-02','bojonegara':'quarry-03','bojong':'quarry-03' },
      product: { 'split 1-2':'prod-01','batu split 1-2':'prod-01','base course':'prod-02','abu batu':'prod-03','pasir':'prod-04','makadam':'prod-05' },
      vendor: { 'ivan':'vendor-05','yudhi':'vendor-06','lintas':'vendor-01','andalas':'vendor-02','samudera':'vendor-03','mitra':'vendor-04' },
      project: { 'dadap':'proj-07','legok':'proj-05','pluit':'proj-06','sunter':'proj-04','bogor':'proj-08','cisumdawu':'proj-01','ciawi':'proj-02','mrt':'proj-03' },
    } as any;
    const findFallback = (map:any, key:string) => {
      const k = (key||'').toLowerCase();
      for (const sub in map) if (k.includes(sub)) return map[sub];
      return null;
    };
    const toCreate: any[] = [];
    const errs: string[] = [];
    rows.slice(0,50).forEach((r:any, idx:number)=>{
      let quarry = (app.quarries||[]).find((q:any)=> (q.name||'').toLowerCase().includes((r.quarryName||'').toLowerCase()));
      let product = (app.products||[]).find((p:any)=> (p.name||'').toLowerCase().includes((r.produkName||'').toLowerCase()));
      let vnd = (app.transportVendors||[]).find((v:any)=> (v.name||'').toLowerCase().includes((r.vendorName||'').toLowerCase()));
      let proj = (app.projects||[]).find((p:any)=> (p.name||'').toLowerCase().includes((r.projectName||'').toLowerCase()));
      // fallback ID jika tidak ketemu
      if (!quarry) { const fid = findFallback(fallback.quarry, r.quarryName); if (fid) quarry = (app.quarries||[]).find((q:any)=>q.id===fid) || { id: fid } as any; }
      if (!product) { const fid = findFallback(fallback.product, r.produkName); if (fid) product = (app.products||[]).find((p:any)=>p.id===fid) || { id: fid } as any; }
      if (!vnd) { const fid = findFallback(fallback.vendor, r.vendorName); if (fid) vnd = (app.transportVendors||[]).find((v:any)=>v.id===fid) || { id: fid } as any; }
      if (!proj) { const fid = findFallback(fallback.project, r.projectName); if (fid) proj = (app.projects||[]).find((p:any)=>p.id===fid) || { id: fid } as any; }
      let ctr = null as any;
      if (proj) ctr = (app.contracts||[]).find((c:any)=> c.projectId===proj.id) || (app.contracts||[])[0];
      if (!quarry || !product || !vnd || !proj || !ctr) {
        errs.push(`baris ${r.idx}: quarry=${quarry?'ok':'x'} produk=${product?'ok':'x'} vendor=${vnd?'ok':'x'} project=${proj?'ok':'x'} kontrak=${ctr?'ok':'x'}`);
        return;
      }
      // hitung vol otomatis dari P×L×T (prioritas), fallback gross/tare, m3_otomatis hanya display/validasi
      const gross = Number(r.raw?.gross_kg || 0);
      const tare = Number(r.raw?.tare_kg || 0);
      const pLen = Number(r.raw?.panjang_m || 0);
      const lWid = Number(r.raw?.lebar_m || 0);
      const tHei = Number(r.raw?.tinggi_m || 0);
      const density = (product as any)?.density || (quarry as any)?.density || 1.6;
      let vol = 0; let w = 0; let meas: any = 'ACTUAL_MEASURED'; let qInfo: any = null;
      if (pLen > 0 && lWid > 0 && tHei > 0) { vol = pLen * lWid * tHei; w = Math.round(vol * density * 1000); meas = 'ACTUAL_MEASURED'; qInfo = { measurementMethod: 'TRUCK_BED_VOLUME', truckBedDimensions: { lengthM: pLen, widthM: lWid, heightM: tHei, calculatedM3: vol } }; }
      else if (gross > 0 && tare > 0 && gross > tare) { vol = Math.max(0, (gross - tare) / 1000 / density); w = gross - tare; meas = 'CALCULATED_FROM_WEIGHT'; qInfo = { measurementMethod: 'WEIGHBRIDGE', grossWeightKg: gross, tareWeightKg: tare, netWeightKg: w, densityUsed: density }; }
      else { const m3auto = Number(r.raw?.m3_otomatis || 0); if (m3auto > 0) { vol = m3auto; w = Math.round(vol * density * 1000); meas = 'ACTUAL_MEASURED'; qInfo = { measurementMethod: 'TRUCK_BED_VOLUME', truckBedDimensions: null }; } else { vol = 0; w = 0; } }
      if (vol <= 0) { errs.push(`baris ${r.idx}: vol 0 — isi gross/tare atau panjang*lebar*tinggi`); return; }
      toCreate.push({
        quarryId: quarry.id,
        productId: product.id,
        transportVendorId: vnd.id,
        contractId: ctr.id,
        scheduledDate: r.tanggal || new Date().toISOString().slice(0,10),
        loadedVolumeM3: Number(vol.toFixed(3)),
        loadedWeightKg: w,
        measurementMode: meas,
        quarryLoadingInfo: qInfo,
        driverName: r.raw?.supir || 'Supir Vendor Armada',
        plateNumber: r.plat,
        notes: r.raw?.sj_imci ? `SJ IMCI ${r.raw.sj_imci}` : '',
        status: r.statusRaw === 'DELIVERED' ? 'DELIVERED' : 'SCHEDULED',
      });
    });
    if (toCreate.length===0) { toast.error('Tidak ada baris yang bisa dipetakan ke master. Cek nama di CSV sesuai: Quarry Rumpin/Sudamanik/Bojonegara, Produk Batu Split 1-2, Vendor IVAN/Yudhi, Project Karya Beton Dadap/Legok/Pluit/Sunter/Bogor.'); return; }
    setIsSubmitting(true);
    try {
      const res: any = await app.bulkCreateDeliveries(toCreate as any);
      setResult({ ok: res.ok, failed: res.failed, batchId: res.batchId });
      if (res.failed.length===0) setRows([]);
    } catch (e:any) { toast.error(e.message||'Gagal bulk'); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center"><Truck className="w-5 h-5 text-primary-foreground" /></div>
          <div>
            <h1 className="text-lg font-black">Tambah Ritase Massal</h1>
            <p className="text-xs text-muted-foreground">Versi minimal — validasi aman, 6 metode tetap (ALL_IN/PER_TRIP primary)</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={downloadTemplate}><Download className="w-4 h-4"/> Download Template CSV</Button>
      </div>
      <Card>
        <CardContent className="space-y-3">
          <div onDragOver={(e)=>e.preventDefault()} onDrop={(e)=>{ e.preventDefault(); const f=e.dataTransfer.files[0]; if(f) onFile(f); toast.success(`File ${f.name} dimuat — ${rows.length} baris`); }} className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/40 transition-colors">
            <FileSpreadsheet className="w-10 h-10 mx-auto text-muted-foreground/50" />
            <p className="mt-2 text-sm font-semibold">Drag & drop file CSV di sini</p>
            <p className="text-xs text-muted-foreground">header wajib: {TEMPLATE_HEADERS.join(', ')}</p>
            <input ref={inputRef} type="file" accept=".csv,.xlsx" className="hidden" onChange={(e)=>{ const f=e.target.files?.[0]; if(f) { onFile(f); toast.success(`File ${f.name} dimuat`); } }} />
            <Button size="sm" onClick={()=>inputRef.current?.click()} className="mt-3"><Upload className="w-4 h-4"/> Pilih File</Button>
            {fileName && <p className="mt-2 text-xs text-muted-foreground flex items-center justify-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600"/> {fileName} — {rows.length} baris</p>}
          </div>
          {rows.length>0 && (
            <div className="space-y-3">
              <div className="overflow-auto border rounded-lg max-h-[300px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted/50">
                    <TableRow>
                      <TableHead className="text-[11px]">#</TableHead>
                      <TableHead className="text-[11px]">TGL</TableHead>
                      <TableHead className="text-[11px]">PLAT</TableHead>
                      <TableHead className="text-[11px]">Quarry→Project</TableHead>
                      <TableHead className="text-[11px]">Produk</TableHead>
                      <TableHead className="text-[11px]">Vendor</TableHead>
                      <TableHead className="text-[11px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>{rows.slice(0,20).map((r:any,i:number)=>(<TableRow key={i}><TableCell>{r.idx}</TableCell><TableCell>{r.tanggal||'-'}</TableCell><TableCell className="font-mono font-bold">{r.plat||'-'}</TableCell><TableCell>{r.quarryName} → {r.projectName}</TableCell><TableCell>{r.produkName}</TableCell><TableCell>{r.vendorName}</TableCell><TableCell><Badge variant="outline" className={r.statusRaw==='DELIVERED'?'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30':'bg-muted text-muted-foreground'}>{r.statusRaw}</Badge></TableCell></TableRow>))}</TableBody>
                </Table>
              </div>
              <div className="flex items-center gap-3">
                <Button size="sm" onClick={async()=>{ await handleSubmit(); if(result) toast.success(`Batch ${result.batchId}: ${result.ok} sukses`); }} disabled={isSubmitting} className="gap-1.5">{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>}{isSubmitting ? 'Import...' : `Import ${rows.length} Ritase`}</Button>
                {result && <div className="text-xs"><span className={`font-semibold ${result.failed?.length? 'text-amber-700':'text-emerald-700'}`}>Batch {result.batchId}: {result.ok} sukses {result.failed?.length? `, ${result.failed.length} gagal`:''}</span>{result.failed?.length>0 && <details className="mt-1 text-[11px] text-destructive"><summary className="cursor-pointer">Lihat 3 error pertama</summary><ul className="list-disc pl-4">{result.failed.slice(0,3).map((f:any,j:number)=><li key={j}>{f.id}: {f.error}</li>)}</ul></details>}</div>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="bg-muted/50">
        <CardContent className="text-xs text-muted-foreground">6 model tetap aktif: <b>ALL_IN</b> & <b>PER_TRIP</b> primary, <b>PER_M3/PER_TON/ROUTE_BASED/HYBRID</b> lain tetap.</CardContent>
      </Card>
    </div>
  );
};
