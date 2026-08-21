import { Invoice, Customer, Contract, InvoiceTemplateId } from '../../../types';
import { generateImciAgregatPdf } from './ImciAgregatTemplate';
import { generateStandardPerRitPdf } from './StandardPerRitTemplate';

export function resolveTemplate(invoice: Invoice, customers: Customer[], contracts: Contract[]): InvoiceTemplateId {
  const cust = customers.find((c) => c.id === invoice.customerId);
  const cont = contracts.find((c) => c.id === invoice.contractId);
  const fromContract = (cont as any)?.templateId as InvoiceTemplateId | undefined;
  if (fromContract) return fromContract;
  const fromCustomer = (cust as any)?.invoiceTemplateId as InvoiceTemplateId | undefined;
  if (fromCustomer) return fromCustomer;
  const isImci = (cust?.name || '').toLowerCase().includes('imci');
  return isImci ? 'IMCI-AGREGAT' : 'STANDARD-PER-RIT';
}

export function generateInvoicePdf(
  invoice: Invoice,
  deps: { customers: Customer[]; projects: any[]; company: any; contracts: Contract[] }
) {
  const tpl = resolveTemplate(invoice, deps.customers, deps.contracts);
  if (tpl === 'IMCI-AGREGAT') return generateImciAgregatPdf({ invoice, customers: deps.customers, projects: deps.projects, company: deps.company });
  return generateStandardPerRitPdf({ invoice, customers: deps.customers, projects: deps.projects, company: deps.company });
}

export const TEMPLATE_LABEL: Record<InvoiceTemplateId, string> = {
  'IMCI-AGREGAT': 'IMCI Agregat',
  'STANDARD-PER-RIT': 'Standar Per-Rit',
};
