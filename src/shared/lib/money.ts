export function formatMoney(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
}

/** Normalizes a user-typed amount (`12,50` or `12.50`) into a parseable decimal string. */
export function normalizeMoneyInput(value: string): string {
  return value.trim().replace(',', '.')
}
