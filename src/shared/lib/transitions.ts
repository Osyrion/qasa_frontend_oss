import type {
  QuoteStatus,
  SupplierInvoiceStatus,
} from '@/api/generated/qASAAPIDocumentation.schemas'

/**
 * Mirrors `QuoteStatus::canTransitionTo()` (qasa_core:
 * app/Modules/Invoicing/Domain/Enums/QuoteStatus.php). The server stays
 * authoritative; a stale map here just means a 422 surfaces as a toast
 * instead of a hidden menu item.
 */
const QUOTE_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ['sent'],
  sent: ['accepted', 'rejected', 'expired'],
  accepted: [],
  rejected: [],
  expired: [],
}

export function getAvailableQuoteTransitions(status: QuoteStatus): QuoteStatus[] {
  return QUOTE_TRANSITIONS[status]
}

export function isQuoteEditable(status: QuoteStatus): boolean {
  return status === 'draft'
}

export function isQuoteTerminal(status: QuoteStatus): boolean {
  return status === 'accepted' || status === 'rejected' || status === 'expired'
}

/**
 * Mirrors `SupplierInvoiceStatus::canTransitionTo()` (qasa_core:
 * app/Modules/Invoicing/Domain/Enums/SupplierInvoiceStatus.php).
 */
const SUPPLIER_INVOICE_TRANSITIONS: Record<SupplierInvoiceStatus, SupplierInvoiceStatus[]> = {
  draft: ['received'],
  received: ['booked', 'paid', 'cancelled'],
  booked: ['paid', 'cancelled'],
  paid: [],
  cancelled: [],
}

export function getAvailableSupplierInvoiceTransitions(
  status: SupplierInvoiceStatus,
): SupplierInvoiceStatus[] {
  return SUPPLIER_INVOICE_TRANSITIONS[status]
}

export function isSupplierInvoiceEditable(status: SupplierInvoiceStatus): boolean {
  return status === 'draft'
}

export function isSupplierInvoiceTerminal(status: SupplierInvoiceStatus): boolean {
  return status === 'paid' || status === 'cancelled'
}
