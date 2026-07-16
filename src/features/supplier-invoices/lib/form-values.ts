export interface VatLineFormValues {
  vat_rate: string
  base: string
  vat_amount: string
}

export interface SupplierInvoiceFormValues {
  client_id: string
  supplier_invoice_number: string
  issued_at: string
  currency: 'CZK' | 'EUR' | 'USD'
  taxable_supply_at: string
  due_at: string
  received_at: string
  exchange_rate: string
  variable_symbol: string
  note: string
  vat_regime: 'domestic' | 'eu_reverse_charge' | 'import'
  vendor_account_number: string
  vendor_bank_code: string
  vendor_iban: string
  vendor_bic: string
  vat_lines: VatLineFormValues[]
}
