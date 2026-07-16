/**
 * Mirrors the backend's `AbilityCatalog::abilities()` — there is no endpoint that
 * lists valid scopes, so this must be kept in sync manually when the backend adds one.
 */
export const TOKEN_ABILITIES = [
  'clients.view',
  'clients.manage',
  'orders.view',
  'orders.manage',
  'invoices.view',
  'invoices.manage',
  'expenses.view',
  'expenses.manage',
  'reports.view',
  'activity.view',
] as const

export type TokenAbility = (typeof TOKEN_ABILITIES)[number]
