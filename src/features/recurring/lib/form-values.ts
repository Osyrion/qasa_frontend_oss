export interface RecurringItemFormValues {
  description: string
  quantity: string
  unit: string
  unit_price: string
  vat_rate: string
}

export interface RecurringFormValues {
  name: string
  client_id: string
  period: 'monthly' | 'quarterly' | 'semiannually' | 'yearly'
  day_of_month: string
  last_day_of_month: boolean
  first_issue_date: string
  end_date: string
  type: 'invoice' | 'proforma'
  currency: 'CZK' | 'EUR' | 'USD'
  due_days: string
  discount_percent: string
  reverse_charge: boolean
  tax_date_mode: 'issue_date' | 'previous_month_end'
  auto_send: boolean
  note_above: string
  note_below: string
  items: RecurringItemFormValues[]
}
