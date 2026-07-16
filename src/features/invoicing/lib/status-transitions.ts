import type { InvoiceStatus } from '@/api/generated/qASAAPIDocumentation.schemas'

/**
 * Mirrors `InvoiceStatus::canTransitionTo()` (qasa_core:
 * app/Modules/Invoicing/Domain/Enums/InvoiceStatus.php), restricted to the subset
 * `POST /invoices/{id}/status` actually accepts — `reminded` is only reachable via
 * the remind endpoint, `credited` only via the corrective endpoint. The server stays
 * authoritative; a stale map here just means a 422 surfaces as a toast instead of a
 * hidden button.
 */
const CLIENT_SETTABLE_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ['issued', 'sent'],
  issued: ['sent', 'paid', 'cancelled'],
  sent: ['paid', 'cancelled'],
  reminded: ['paid', 'cancelled'],
  paid: [],
  cancelled: [],
  credited: [],
}

export function getAvailableTransitions(status: InvoiceStatus): InvoiceStatus[] {
  return CLIENT_SETTABLE_TRANSITIONS[status]
}

export function isEditable(status: InvoiceStatus): boolean {
  return status === 'draft'
}

export function isTerminal(status: InvoiceStatus): boolean {
  return status === 'cancelled' || status === 'credited'
}

export function canRemind(status: InvoiceStatus): boolean {
  return status === 'sent' || status === 'reminded'
}

export function canRecordPayment(status: InvoiceStatus): boolean {
  return status === 'issued' || status === 'sent' || status === 'reminded' || status === 'paid'
}

export function canCreateCorrective(status: InvoiceStatus): boolean {
  return status === 'issued' || status === 'sent' || status === 'reminded' || status === 'paid'
}

export function canManagePublicLink(status: InvoiceStatus): boolean {
  return status !== 'draft'
}
