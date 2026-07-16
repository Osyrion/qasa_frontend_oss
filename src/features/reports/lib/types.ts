export interface VatControlStatementRow {
  document_number: string
  date: string
  partner_name: string
  partner_tax_id: string | null
  rate: number
  base: number
  vat: number
  related_document_number: string | null
}

export interface VatControlStatementSummaryRow {
  rate: number
  base: number
  vat: number
}

/** Keyed by section code (e.g. A1, A2, B1, B2 for SK; A1, A4, B1, B2 for CZ). */
export type VatControlStatementSections = Record<string, VatControlStatementRow[]>
export type VatControlStatementSummarySections = Record<string, VatControlStatementSummaryRow[]>
