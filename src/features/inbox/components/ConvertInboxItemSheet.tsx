import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import {
  useGetInvoiceInboxInboxItemDownload,
  usePostInvoiceInboxInboxItemConvert,
} from '@/api/generated/invoice-inbox/invoice-inbox'
import type { InvoiceInboxItem } from '@/api/generated/qASAAPIDocumentation.schemas'
import { VatLinesEditor } from '@/features/supplier-invoices/components/VatLinesEditor'
import { VendorSelect } from '@/features/supplier-invoices/components/VendorSelect'
import type { SupplierInvoiceFormValues } from '@/features/supplier-invoices/lib/form-values'
import { TextField } from '@/shared/components/TextField'
import { applyLaravelErrors } from '@/shared/lib/laravel-errors'
import { normalizeMoneyInput } from '@/shared/lib/money'
import { queryClient } from '@/shared/lib/query-client'
import { Button } from '@/shared/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/shared/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/shared/ui/sheet'
import { Spinner } from '@/shared/ui/spinner'

const CURRENCIES = ['CZK', 'EUR', 'USD'] as const

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function suggestionString(
  suggestions: Record<string, unknown> | null | undefined,
  key: string,
): string {
  const value = suggestions?.[key]
  return typeof value === 'string' ? value : ''
}

function valuesFromItem(item: InvoiceInboxItem): SupplierInvoiceFormValues {
  const suggestions = (item.suggestions ?? {}) as Record<string, unknown>
  return {
    client_id: item.matched_client?.id ?? '',
    supplier_invoice_number: suggestionString(suggestions, 'supplier_invoice_number'),
    issued_at: suggestionString(suggestions, 'issued_at') || todayIso(),
    currency: (suggestionString(suggestions, 'currency') ||
      'EUR') as SupplierInvoiceFormValues['currency'],
    taxable_supply_at: suggestionString(suggestions, 'taxable_supply_at'),
    due_at: suggestionString(suggestions, 'due_at'),
    received_at: '',
    exchange_rate: '',
    variable_symbol: suggestionString(suggestions, 'variable_symbol'),
    note: '',
    vat_regime: 'domestic',
    vendor_account_number: suggestionString(suggestions, 'account_number'),
    vendor_bank_code: suggestionString(suggestions, 'bank_code'),
    vendor_iban: suggestionString(suggestions, 'iban'),
    vendor_bic: '',
    vat_lines: [{ vat_rate: '0', base: '', vat_amount: '' }],
  }
}

interface ConvertInboxItemSheetProps {
  item: InvoiceInboxItem | null
  onOpenChange: (open: boolean) => void
}

export function ConvertInboxItemSheet({ item, onOpenChange }: ConvertInboxItemSheetProps) {
  const { t } = useTranslation('inbox')
  const { t: tSupplierInvoices } = useTranslation('supplierInvoices')
  const [objectUrl, setObjectUrl] = useState<string | null>(null)

  const preview = useGetInvoiceInboxInboxItemDownload(item?.id ?? '', {
    query: { enabled: Boolean(item?.id) },
  })

  useEffect(() => {
    if (!preview.data) return
    const url = URL.createObjectURL(preview.data)
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [preview.data])

  const schema = z.object({
    client_id: z.string().min(1, tSupplierInvoices('validation.vendor_required')),
    supplier_invoice_number: z
      .string()
      .min(1, tSupplierInvoices('validation.supplier_invoice_number_required'))
      .max(60),
    issued_at: z.string().min(1),
    currency: z.enum(CURRENCIES),
    taxable_supply_at: z.string(),
    due_at: z.string(),
    received_at: z.string(),
    exchange_rate: z.string(),
    variable_symbol: z.string(),
    note: z.string(),
    vat_regime: z.enum(['domestic', 'eu_reverse_charge', 'import']),
    vendor_account_number: z.string(),
    vendor_bank_code: z.string(),
    vendor_iban: z.string(),
    vendor_bic: z.string(),
    vat_lines: z
      .object({ vat_rate: z.string(), base: z.string(), vat_amount: z.string() })
      .array()
      .min(1),
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    control,
    formState: { errors },
  } = useForm<SupplierInvoiceFormValues>({
    resolver: zodResolver(schema),
    defaultValues: item ? valuesFromItem(item) : undefined,
  })

  useEffect(() => {
    if (item) reset(valuesFromItem(item))
  }, [item, reset])

  const convert = usePostInvoiceInboxInboxItemConvert({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ['/api/v1/invoice-inbox'] })
        toast.success(t('convert_sheet.converted'))
        onOpenChange(false)
      },
      onError: (error) => {
        const message = applyLaravelErrors(error, setError)
        if (message) toast.error(message)
      },
    },
  })

  const onSubmit: SubmitHandler<SupplierInvoiceFormValues> = (values) => {
    if (!item?.id) return
    convert.mutate({
      inboxItem: item.id,
      data: {
        client_id: values.client_id,
        supplier_invoice_number: values.supplier_invoice_number,
        issued_at: values.issued_at,
        currency: values.currency,
        taxable_supply_at: values.taxable_supply_at || null,
        due_at: values.due_at || null,
        received_at: values.received_at || null,
        exchange_rate: values.exchange_rate
          ? Number(normalizeMoneyInput(values.exchange_rate))
          : null,
        variable_symbol: values.variable_symbol || null,
        note: values.note || null,
        vat_regime: values.vat_regime,
        vendor_account_number: values.vendor_account_number || null,
        vendor_bank_code: values.vendor_bank_code || null,
        vendor_iban: values.vendor_iban || null,
        vendor_bic: values.vendor_bic || null,
        vat_lines: values.vat_lines.map((line) => ({
          vat_rate: Number(line.vat_rate),
          base: Number(normalizeMoneyInput(line.base)),
          vat_amount: Number(normalizeMoneyInput(line.vat_amount)),
        })),
      },
    })
  }

  return (
    <Sheet open={Boolean(item)} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 sm:max-w-4xl">
        <SheetHeader>
          <SheetTitle>{t('convert_sheet.title')}</SheetTitle>
        </SheetHeader>
        <div className="grid flex-1 grid-cols-2 gap-4 overflow-y-auto px-4 pb-4">
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">{t('convert_sheet.preview')}</p>
            {preview.isPending || !objectUrl ? (
              <div className="flex flex-1 items-center justify-center">
                <Spinner />
              </div>
            ) : item?.mime_type === 'application/pdf' ? (
              <iframe
                src={objectUrl}
                title="preview"
                className="h-full min-h-96 w-full rounded-lg border"
              />
            ) : (
              <img
                src={objectUrl}
                alt={item?.original_filename}
                className="w-full rounded-lg border"
              />
            )}
          </div>

          {item && (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
              <FieldGroup>
                {item.matched_client && (
                  <p className="text-xs text-muted-foreground">
                    {t('convert_sheet.matched_vendor')}
                  </p>
                )}
                <Field>
                  <FieldLabel htmlFor="convert-client">
                    {tSupplierInvoices('form.vendor')}
                  </FieldLabel>
                  <VendorSelect
                    id="convert-client"
                    value={watch('client_id')}
                    onChange={(clientId) => setValue('client_id', clientId)}
                  />
                  {errors.client_id && (
                    <p className="text-sm text-destructive">{errors.client_id.message}</p>
                  )}
                </Field>

                <TextField
                  id="convert-number"
                  label={tSupplierInvoices('form.supplier_invoice_number')}
                  error={errors.supplier_invoice_number}
                  {...register('supplier_invoice_number')}
                />

                <div className="grid grid-cols-2 gap-3">
                  <TextField
                    id="convert-issued-at"
                    type="date"
                    label={tSupplierInvoices('form.issued_at')}
                    error={errors.issued_at}
                    {...register('issued_at')}
                  />
                  <TextField
                    id="convert-due-at"
                    type="date"
                    label={tSupplierInvoices('form.due_at')}
                    error={errors.due_at}
                    {...register('due_at')}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel htmlFor="convert-currency">
                      {tSupplierInvoices('form.currency')}
                    </FieldLabel>
                    <Select
                      value={watch('currency')}
                      onValueChange={(value) =>
                        setValue('currency', value as SupplierInvoiceFormValues['currency'])
                      }
                    >
                      <SelectTrigger id="convert-currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((currency) => (
                          <SelectItem key={currency} value={currency}>
                            {currency}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="convert-vat-regime">
                      {tSupplierInvoices('form.vat_regime')}
                    </FieldLabel>
                    <Select
                      value={watch('vat_regime')}
                      onValueChange={(value) =>
                        setValue('vat_regime', value as SupplierInvoiceFormValues['vat_regime'])
                      }
                    >
                      <SelectTrigger id="convert-vat-regime">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="domestic">
                          {tSupplierInvoices('vat_regime.domestic')}
                        </SelectItem>
                        <SelectItem value="eu_reverse_charge">
                          {tSupplierInvoices('vat_regime.eu_reverse_charge')}
                        </SelectItem>
                        <SelectItem value="import">
                          {tSupplierInvoices('vat_regime.import')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <TextField
                  id="convert-variable-symbol"
                  label={tSupplierInvoices('form.variable_symbol')}
                  error={errors.variable_symbol}
                  {...register('variable_symbol')}
                />

                <div className="grid grid-cols-2 gap-3">
                  <TextField
                    id="convert-account-number"
                    label={tSupplierInvoices('form.vendor_account_number')}
                    error={errors.vendor_account_number}
                    {...register('vendor_account_number')}
                  />
                  <TextField
                    id="convert-bank-code"
                    label={tSupplierInvoices('form.vendor_bank_code')}
                    error={errors.vendor_bank_code}
                    {...register('vendor_bank_code')}
                  />
                </div>
                <TextField
                  id="convert-iban"
                  label={tSupplierInvoices('form.vendor_iban')}
                  error={errors.vendor_iban}
                  {...register('vendor_iban')}
                />
              </FieldGroup>

              <VatLinesEditor
                control={control}
                errors={errors}
                currency={watch('currency')}
                editable
              />
            </form>
          )}
        </div>
        <SheetFooter className="flex-row justify-end border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tSupplierInvoices('actions.cancel')}
          </Button>
          <Button onClick={handleSubmit(onSubmit)} disabled={convert.isPending}>
            {t('convert_sheet.submit')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
