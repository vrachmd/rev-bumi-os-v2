# Multi-Template Faktur Penagihan — Rencana

> Status: draft 2026-08-21 · Owner: Finance + Commercial
> Template aktif sekarang: **IMCI-Agregat** (`InvoicesView.tsx` agregat group) — hanya untuk `customer.name ilike %IMCI%`.

## 1. Tujuan
IMCI butuh format agregat khusus (1 baris grup `split 1-2` + list `tgl plat IMCI vol (KBS ...)` + suffix alias, footer BCA). Pelanggan lain (Waskita, WIKA, HK, dll.) butuh format berbeda (per-rit detail, Pajak terpisah, Kop berbeda). Multi-template agar 1 engine finance bisa render N layout tanpa duplikat logic.

## 2. Template Registry (usulan)

| Template ID | Nama | Kapan dipakai | Layout kunci | Status |
|---|---|---|---|---|
| `IMCI-AGREGAT` | IMCI Agregat | `customer.imci == true` atau `contract.templateId == 'IMCI-AGREGAT'` | Group by product+price, Deskripsi=blok `tgl plat imci vol (KBS alias)`, Kuantitas/Harga/Jumlah center bold, header CV, bank BCA | **Aktif** (saat ini) |
| `STANDARD-PER-RIT` | Standar Per-Rit | Default untuk non-IMCI | Per-rit 1 baris: No|Deskripsi (SJ RBN + plat + tgl)|Approved|Harga|Total DPP — font 7.5, tanpa alias KBS | Backlog |
| `REKAP-SUMMARY` | Rekap Summary | Proyek retail / tagihan borongan | Hanya 1-3 baris ringkas per material (tanpa list rit), lampiran rit terpisah | Backlog |
| `KUITANSI-IMCI` | Kuitansi Bermaterai 10k | Hal 2 referensi (gambar materai) | Hal 2 setelah faktur IMCI: kwitansi tulisan tangan + materai 10k | Backlog |

## 3. Arsitektur

### 3.1 Data-driven selection
```ts
// types/index.ts
export type InvoiceTemplateId = 'IMCI-AGREGAT' | 'STANDARD-PER-RIT' | 'REKAP-SUMMARY';

export interface Contract { templateId?: InvoiceTemplateId; ... }
export interface Customer { invoiceTemplateId?: InvoiceTemplateId; ... }

function resolveTemplate(inv: Invoice): InvoiceTemplateId {
  const cust = customers.find(c=>c.id===inv.customerId);
  const cont = contracts.find(c=>c.id===inv.contractId);
  return cont?.templateId ?? cust?.invoiceTemplateId ?? (cust?.name.toLowerCase().includes('imci') ? 'IMCI-AGREGAT' : 'STANDARD-PER-RIT');
}
```

### 3.2 File structure (tidak ubah engine)
```
apps/web/src/components/finance/
  InvoicesView.tsx              // selector + modal, tetap
  invoice-templates/
    index.ts                    // registry + resolveTemplate()
    ImciAgregatTemplate.tsx     // pindahkan logika PDF+Preview IMCI sekarang ke sini
    StandardPerRitTemplate.tsx  // per-rit detail (reuse engine lama pre-agregat)
    RekapSummaryTemplate.tsx    // 1 baris per material
    shared/
      InvoiceHeader.tsx         // RBN box + CV/PT + alamat + NPWP
      InvoiceFooter.tsx         // bank BCA/Mandiri + tanda tangan (prop bank)
      useInvoiceCompany.ts      // ambil company dari Supabase
```

### 3.3 Engine tetap single source
- `finance.engine.ts` hitung `subtotal, tax, total` tetap sama.
- Template hanya beda **presentasi**: grouping, kolom, alias, bank, header.
- `supabaseFinance.ts` sudah simpan `delivery_date/sj_imci/plate_number` → semua template bisa pakai.

### 3.4 Preview & PDF
- Tiap template export 2 fungsi: `renderPreview(invoice)` (JSX) + `generatePdf(invoice)` (jsPDF+autoTable).
- `InvoicesView` tombol `Cetak` cukup `const tpl = resolveTemplate(inv); const pdf = await tpl.generatePdf(inv); pdf.save(...)`
- AutoTable kolom disesuaikan: IMCI `Deskripsi|Kuantitas|Harga|Jumlah` (agregat), Standard `No|Deskripsi|Approved|Harga|Total DPP`.

## 4. UI Commercial
- Di `Commercial/ContractsView` & `Master Customers`: dropdown `Template Faktur` (pilihan registry, default kosong = auto).
- Badge di tabel Invoices: `IMCI-AGREGAT` hijau, `STANDARD` abu.
- Validasi: jika kontrak sudah punya faktur, ganti template butuh konfirmasi.

## 5. Bank & Kop per template
- Simpan `bankName, bankBranch, accountNo, accountHolder` di `Company` atau `Contract` (override).
- IMCI: `BCA Alam Sutera 6044884563 a.n. REV BUMI NUSANTARA CV`
- Non-IMCI: bisa `Mandiri Cirebon ...` via config tanpa kode.

## 6. Langkah Implementasi (Fase)

**Fase A — Ekstraksi IMCI (1 hari)**
1. Refactor `InvoicesView.tsx` logika IMCI sekarang → `invoice-templates/ImciAgregatTemplate.tsx` (PDF + Preview).
2. Buat `registry.ts` + `resolveTemplate()` (default IMCI jika nama contains imci, else STANDARD).
3. `InvoicesView` tetap jalan tanpa perubahan visible (regression test 5 vs 20 item).

**Fase B — Standard Per-Rit (1 hari)**
1. Buat `StandardPerRitTemplate.tsx` (reuse code sebelum agregat: per-rit 5 kolom, font adaptif, tidak pakai alias).
2. Tambah dropdown template di Contracts/Customers + migration `0010_invoice_template.sql` (`customers.invoice_template_id`, `contracts.template_id`).
3. Verifikasi 2 template jalan bergantian.

**Fase C — Polish & Kuitansi (0.5 hari)**
1. `RekapSummaryTemplate` + halaman 2 Kuitansi bermaterai (opsional print).
2. Test 3 template di `app.revbuminusantara.biz.id` (IMCI, Waskita, retail).

## 7. Risiko & Mitigasi
- **Banyak template → duplikat PDF code**: mitigasi `shared/Header/Footer` + helper `fmtShortDate, kbsAlias, formatIDR`.
- **Data lama tanpa sj_imci/plate**: fallback `'-'` + sort by deliveryNumber.
- **RBAC**: hanya `FINANCE/COMMERCIAL/SUPER_ADMIN` boleh ganti template.

## 8. Keputusan untuk user
- Setuju template ID & registry di atas?
- Bank per template mau di-hardcode di template atau di `companies`/`contracts` (env-driven)?
- Hal 2 Kuitansi materai perlu sekarang atau nanti?

> Setelah approve, eksekusi Fase A dulu (IMCI jadi template terpisah, non-IMCI otomatis fallback STANDARD).
