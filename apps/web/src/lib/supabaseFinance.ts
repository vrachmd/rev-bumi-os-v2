import { supabase } from './supabase';
import { Invoice, InvoiceItem, Payment } from '../types';

/**
 * Service layer keuangan ↔ Supabase (Fase 0.6).
 * Memetakan Invoice (dengan items) & Payment antara bentuk aplikasi
 * (camelCase) dan tabel DB (snake_case), plus subscribe Realtime.
 */

export interface FinanceSyncResult {
  entity: string;
  tables: { table: string; ok: boolean; error?: string }[];
}

interface InvoiceDbRow {
  id: string;
  invoice_number: string;
  customer_id: string;
  project_id: string;
  contract_id: string;
  invoice_date: string;
  due_date: string | null;
  total_approved_volume_m3: number;
  subtotal_idr: number;
  tax_rate_percent: number;
  tax_amount_idr: number;
  total_invoice_idr: number;
  total_paid_idr: number;
  outstanding_balance_idr: number;
  status: Invoice['status'];
  notes: string | null;
  created_at: string;
}

interface InvoiceItemDbRow {
  id: string;
  invoice_id: string;
  delivery_id: string;
  delivery_number: string;
  delivery_date: string | null;
  sj_imci: string | null;
  plate_number: string | null;
  product_name: string;
  approved_volume_m3: number;
  unit_price_per_m3: number;
  item_total_idr: number;
}

interface PaymentDbRow {
  id: string;
  invoice_id: string;
  invoice_number: string;
  customer_name: string;
  payment_date: string;
  amount_paid_idr: number;
  bank_reference: string;
  payment_method: string;
  notes: string | null;
  recorded_by: string;
  created_at: string;
}

const mapInvoice = (r: InvoiceDbRow, items: InvoiceItem[]): Invoice => ({
  id: r.id,
  invoiceNumber: r.invoice_number,
  customerId: r.customer_id,
  projectId: r.project_id,
  contractId: r.contract_id,
  invoiceDate: r.invoice_date,
  dueDate: r.due_date ?? '',
  items,
  totalApprovedVolumeM3: Number(r.total_approved_volume_m3),
  subtotalIdr: Number(r.subtotal_idr),
  taxRatePercent: Number(r.tax_rate_percent),
  taxAmountIdr: Number(r.tax_amount_idr),
  totalInvoiceIdr: Number(r.total_invoice_idr),
  totalPaidIdr: Number(r.total_paid_idr),
  outstandingBalanceIdr: Number(r.outstanding_balance_idr),
  status: r.status,
  notes: r.notes ?? undefined,
  createdAt: r.created_at,
});

const mapInvoiceItem = (r: InvoiceItemDbRow): InvoiceItem => ({
  id: r.id,
  invoiceId: r.invoice_id,
  deliveryId: r.delivery_id,
  deliveryNumber: r.delivery_number,
  deliveryDate: r.delivery_date ?? undefined,
  sjImci: r.sj_imci ?? undefined,
  plateNumber: r.plate_number ?? undefined,
  productName: r.product_name,
  approvedVolumeM3: Number(r.approved_volume_m3),
  unitPricePerM3: Number(r.unit_price_per_m3),
  itemTotalIdr: Number(r.item_total_idr),
});

const mapPayment = (r: PaymentDbRow): Payment => ({
  id: r.id,
  invoiceId: r.invoice_id,
  invoiceNumber: r.invoice_number,
  customerName: r.customer_name,
  paymentDate: r.payment_date,
  amountPaidIdr: Number(r.amount_paid_idr),
  bankReference: r.bank_reference,
  paymentMethod: r.payment_method,
  notes: r.notes ?? undefined,
  recordedBy: r.recorded_by,
  createdAt: r.created_at,
});

/**
 * Ambil seluruh invoice (beserta items) & payments dari Supabase.
 */
export async function fetchFinanceFromSupabase(): Promise<{ invoices: Invoice[]; payments: Payment[] }> {
  const [invRes, itemRes, payRes] = await Promise.all([
    supabase.from('invoices').select('*').order('created_at', { ascending: false }),
    supabase.from('invoice_items').select('*'),
    supabase.from('payments').select('*').order('created_at', { ascending: false }),
  ]);

  if (invRes.error) throw invRes.error;

  const itemsByInvoice = new Map<string, InvoiceItem[]>();
  (itemRes.data ?? []).forEach((r) => {
    const item = mapInvoiceItem(r as InvoiceItemDbRow);
    const list = itemsByInvoice.get(item.invoiceId) ?? [];
    list.push(item);
    itemsByInvoice.set(item.invoiceId, list);
  });

  const invoices = (invRes.data ?? []).map((r) => {
    const row = r as InvoiceDbRow;
    return mapInvoice(row, itemsByInvoice.get(row.id) ?? []);
  });

  const payments = (payRes.data ?? []).map((r) => mapPayment(r as PaymentDbRow));

  return { invoices, payments };
}

const toInvoiceDbRow = (inv: Invoice): InvoiceDbRow => ({
  id: inv.id,
  invoice_number: inv.invoiceNumber,
  customer_id: inv.customerId,
  project_id: inv.projectId,
  contract_id: inv.contractId,
  invoice_date: inv.invoiceDate,
  due_date: inv.dueDate || null,
  total_approved_volume_m3: inv.totalApprovedVolumeM3,
  subtotal_idr: inv.subtotalIdr,
  tax_rate_percent: inv.taxRatePercent,
  tax_amount_idr: inv.taxAmountIdr,
  total_invoice_idr: inv.totalInvoiceIdr,
  total_paid_idr: inv.totalPaidIdr,
  outstanding_balance_idr: inv.outstandingBalanceIdr,
  status: inv.status,
  notes: inv.notes ?? null,
  created_at: inv.createdAt,
});

/**
 * Simpan satu invoice (beserta items) ke Supabase via upsert.
 */
export async function upsertInvoiceToSupabase(invoice: Invoice): Promise<FinanceSyncResult> {
  const tables: FinanceSyncResult['tables'] = [];

  const push = async (table: string, rows: object[], onConflict?: string) => {
    if (rows.length === 0) return;
    const { error } = await supabase
      .from(table)
      .upsert(rows, { onConflict: onConflict ?? 'id' });
    tables.push({ table, ok: !error, error: error?.message });
  };

  await push('invoices', [toInvoiceDbRow(invoice)]);

  const itemRows: InvoiceItemDbRow[] = invoice.items.map((it) => ({
    id: it.id,
    invoice_id: invoice.id,
    delivery_id: it.deliveryId,
    delivery_number: it.deliveryNumber,
    delivery_date: it.deliveryDate ?? null,
    sj_imci: it.sjImci ?? null,
    plate_number: it.plateNumber ?? null,
    product_name: it.productName,
    approved_volume_m3: it.approvedVolumeM3,
    unit_price_per_m3: it.unitPricePerM3,
    item_total_idr: it.itemTotalIdr,
  }));
  await push('invoice_items', itemRows);

  return { entity: invoice.id, tables };
}

/**
 * Simpan satu payment + perbarui total outstanding invoice terkait.
 */
export async function upsertPaymentToSupabase(
  payment: Payment,
  invoice: Invoice
): Promise<FinanceSyncResult> {
  const tables: FinanceSyncResult['tables'] = [];

  const { error: payErr } = await supabase.from('payments').upsert(
    {
      id: payment.id,
      invoice_id: payment.invoiceId,
      invoice_number: payment.invoiceNumber,
      customer_name: payment.customerName,
      payment_date: payment.paymentDate,
      amount_paid_idr: payment.amountPaidIdr,
      bank_reference: payment.bankReference,
      payment_method: payment.paymentMethod,
      notes: payment.notes ?? null,
      recorded_by: payment.recordedBy,
      created_at: payment.createdAt,
    },
    { onConflict: 'id' }
  );
  tables.push({ table: 'payments', ok: !payErr, error: payErr?.message });

  const { error: invErr } = await supabase
    .from('invoices')
    .update({
      total_paid_idr: invoice.totalPaidIdr,
      outstanding_balance_idr: invoice.outstandingBalanceIdr,
      status: invoice.status,
    })
    .eq('id', invoice.id);
  tables.push({ table: 'invoices', ok: !invErr, error: invErr?.message });

  return { entity: payment.id, tables };
}

export async function deleteInvoiceFromSupabase(invoiceId: string): Promise<void> {
  // invoice_items cascade via FK, tapi hapus eksplisit agar RLS jelas
  const { error: itemErr } = await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId);
  if (itemErr) throw itemErr;
  const { error: invErr } = await supabase.from('invoices').delete().eq('id', invoiceId);
  if (invErr) throw invErr;
}

/**
 * Subscribe perubahan Realtime pada tabel keuangan.
 */
export function subscribeFinanceChanges(onChange: () => void): () => void {
  const channel = supabase
    .channel('finance-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'invoice_items' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, onChange)
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}