/**
 * Mirrors `PeriodPlaceholderResolver` (qasa_core:
 * app/Modules/Invoicing/Domain/Services/PeriodPlaceholderResolver.php) — fixed
 * numeric date formats, locale-independent. The real value is resolved at
 * generation time against the tax period date; this is a preview only.
 */
export function resolvePlaceholders(text: string, referenceDate: Date = new Date()): string {
  const bom = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1)
  const eom = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0)
  const formatDMY = (date: Date) => `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`
  const monthYear = `${String(referenceDate.getMonth() + 1).padStart(2, '0')}/${referenceDate.getFullYear()}`

  return text
    .replaceAll('{BOM}', formatDMY(bom))
    .replaceAll('{EOM}', formatDMY(eom))
    .replaceAll('{MONTH}', monthYear)
    .replaceAll('{YEAR}', String(referenceDate.getFullYear()))
}
