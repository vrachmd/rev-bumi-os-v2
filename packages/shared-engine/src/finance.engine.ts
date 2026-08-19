import { InvoicingBasis } from 'shared-types'

export function calculateInvoice(
  deliveredM3: number,
  unitPrice: number,
  invoicingBasis: InvoicingBasis,
  loadedM3: number,
  receivedM3: number,
  penaltyAmount: number
): { subtotal: number; ppn: number; total: number } {
  let baseVolume: number

  switch (invoicingBasis) {
    case 'MIN_OF_BOTH':
      baseVolume = Math.min(loadedM3, receivedM3)
      break
    case 'SITE_RECEIVED':
      baseVolume = receivedM3
      break
    case 'QUARRY_LOADED':
      baseVolume = loadedM3
      break
    default:
      baseVolume = deliveredM3
  }

  const subtotal = baseVolume * unitPrice
  const ppn = subtotal * 0.11
  const total = subtotal + ppn - penaltyAmount

  return { subtotal, ppn, total }
}