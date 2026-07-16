import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'

import {
  useGetSupplierInvoicesId,
  usePostSupplierInvoices,
  usePutSupplierInvoicesId,
} from '@/api/generated/supplier-invoices/supplier-invoices'
import {
  PostSupplierInvoicesBodyCurrency,
  PostSupplierInvoicesBodyVatRegime,
  type PostSupplierInvoicesBody,
  type SupplierInvoice,
} from '@/api/generated/qASAAPIDocumentation.schemas'
import { VatLinesEditor } from '@/features/supplier-invoices/components/VatLinesEditor'
import { VendorSelect } from '@/features/supplier-invoices/components/VendorSelect'
import type { SupplierInvoiceFormValues } from '@/features/supplier-invoices/lib/form-values'
import { isSupplierInvoiceEditable } from '@/shared/lib/transitions'
import { TextField } from '@/shared/components/TextField'
import { applyLaravelErrors } from '@/shared/lib/laravel-errors'
import { normalizeMoneyInput } from '@/shared/lib/money'
import { queryClient } from '@/shared/lib/query-client'
import { Button } from '@/shared/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/shared/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Spinner } from '@/shared/ui/spinner'
import { Textarea } from '@/shared/ui/textarea'

const CURRENCIES = Object.values(PostSupplierInvoicesBodyCurrency)
const VAT_REGIMES = Object.values(PostSupplierInvoicesBodyVatRegime)

const ACCOUNT_NUMBER_RE = /^(\d{1,6}-)?\d{2,10}$/
const BANK_CODE_RE = /^\d{4}$/
const IBAN_RE = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/
const BIC_RE = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function defaultValues(): SupplierInvoiceFormValues {
  return {
    client_id: '',
    supplier_invoice_number: '',
    issued_at: todayIso(),
    currency: 'EUR',
    taxable_supply_at: '',
    due_at: '',
    received_at: '',
    exchange_rate: '',
    variable_symbol: '',
    note: '',
    vat_regime: 'domestic',
    vendor_account_number: '',
    vendor_bank_code: '',
    vendor_iban: '',
    vendor_bic: '',
    vat_lines: [{ vat_rate: '0', base: '', vat_amount: '' }],
  }
}

function invoiceToFormValues(invoice: SupplierInvoice): SupplierInvoiceFormValues {
  return {
    client_id: invoice.client?.id ?? '',
    supplier_invoice_number: invoice.supplier_invoice_number ?? '',
    issued_at: invoice.issued_at ?? todayIso(),
    currency: (invoice.currency ?? 'EUR') as SupplierInvoiceFormValues['currency'],
    taxable_supply_at: invoice.taxable_supply_at ?? '',
    due_at: invoice.due_at ?? '',
    received_at: invoice.received_at ?? '',
    exchange_rate: invoice.exchange_rate != null ? String(invoice.exchange_rate) : '',
    variable_symbol: invoice.variable_symbol ?? '',
    note: invoice.note ?? '',
    vat_regime: (invoice.vat_regime ?? 'domestic') as SupplierInvoiceFormValues['vat_regime'],
    vendor_account_number: invoice.vendor_account_number ?? '',
    vendor_bank_code: invoice.vendor_bank_code ?? '',
    vendor_iban: invoice.vendor_iban ?? '',
    vendor_bic: invoice.vendor_bic ?? '',
    vat_lines:
      invoice.vat_lines && invoice.vat_lines.length > 0
        ? invoice.vat_lines.map((line) => ({
            vat_rate: line.vat_rate != null ? String(line.vat_rate) : '0',
            base: line.base != null ? String(line.base) : '',
            vat_amount: line.vat_amount != null ? String(line.vat_amount) : '',
          }))
        : [{ vat_rate: '0', base: '', vat_amount: '' }],
  }
}

export function SupplierInvoiceFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { t } = useTranslation('supplierInvoices')
  const { t: tCommon } = useTranslation()

  const existing = useGetSupplierInvoicesId(id ?? '', { query: { enabled: isEdit } })

  useEffect(() => {
    if (isEdit && existing.data && !isSupplierInvoiceEditable(existing.data.status ?? 'draft')) {
      toast.error(t('form.not_editable'))
      void navigate(`/supplier-invoices/${id}`, { replace: true })
    }
  }, [existing.data, id, isEdit, navigate, t])

  const schema = useMemo(
    () =>
      z
        .object({
          client_id: z.string().min(1, t('validation.vendor_required')),
          supplier_invoice_number: z
            .string()
            .min(1, t('validation.supplier_invoice_number_required'))
            .max(60),
          issued_at: z.string().min(1),
          currency: z.enum(CURRENCIES),
          taxable_supply_at: z.string(),
          due_at: z.string(),
          received_at: z.string(),
          exchange_rate: z.string(),
          variable_symbol: z.string().regex(/^\d{0,10}$/, t('validation.variable_symbol')),
          note: z.string(),
          vat_regime: z.enum(VAT_REGIMES),
          vendor_account_number: z
            .string()
            .refine((v) => !v || ACCOUNT_NUMBER_RE.test(v), {
              message: t('validation.vendor_account_number'),
            }),
          vendor_bank_code: z
            .string()
            .refine((v) => !v || BANK_CODE_RE.test(v), {
              message: t('validation.vendor_bank_code'),
            }),
          vendor_iban: z
            .string()
            .refine((v) => !v || IBAN_RE.test(v), { message: t('validation.vendor_iban') }),
          vendor_bic: z
            .string()
            .refine((v) => !v || BIC_RE.test(v), { message: t('validation.vendor_bic') }),
          vat_lines: z
            .object({
              vat_rate: z.string(),
              base: z.string().refine((v) => Number(normalizeMoneyInput(v)) >= 0, {
                message: t('validation.base_non_negative'),
              }),
              vat_amount: z.string().refine((v) => Number(normalizeMoneyInput(v)) >= 0, {
                message: t('validation.vat_amount_non_negative'),
              }),
            })
            .array()
            .min(1),
        })
        .refine((data) => Boolean(data.vendor_account_number) === Boolean(data.vendor_bank_code), {
          path: ['vendor_bank_code'],
          message: t('validation.account_pair_domestic'),
        })
        .refine((data) => Boolean(data.vendor_iban) === Boolean(data.vendor_bic), {
          path: ['vendor_bic'],
          message: t('validation.account_pair_iban'),
        }),
    [t],
  )

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
    defaultValues: defaultValues(),
  })

  useEffect(() => {
    if (existing.data) {
      reset(invoiceToFormValues(existing.data))
    }
  }, [existing.data, reset])

  const toBody = (values: SupplierInvoiceFormValues): PostSupplierInvoicesBody => ({
    client_id: values.client_id,
    supplier_invoice_number: values.supplier_invoice_number,
    issued_at: values.issued_at,
    currency: values.currency,
    taxable_supply_at: values.taxable_supply_at || null,
    due_at: values.due_at || null,
    received_at: values.received_at || null,
    exchange_rate: values.exchange_rate ? Number(normalizeMoneyInput(values.exchange_rate)) : null,
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
  })

  const createMutation = usePostSupplierInvoices({
    mutation: {
      onSuccess: (invoice) => {
        void queryClient.invalidateQueries({ queryKey: ['/api/v1/supplier-invoices'] })
        toast.success(t('form.created'))
        void navigate(`/supplier-invoices/${invoice.id}`)
      },
      onError: (error) => {
        const message = applyLaravelErrors(error, setError)
        if (message) toast.error(message)
      },
    },
  })

  const updateMutation = usePutSupplierInvoicesId({
    mutation: {
      onSuccess: (invoice) => {
        void queryClient.invalidateQueries({ queryKey: ['/api/v1/supplier-invoices'] })
        toast.success(t('form.updated'))
        void navigate(`/supplier-invoices/${invoice.id}`)
      },
      onError: (error) => {
        const message = applyLaravelErrors(error, setError)
        if (message) toast.error(message)
      },
    },
  })

  const onSubmit: SubmitHandler<SupplierInvoiceFormValues> = (values) => {
    if (isEdit && id) {
      updateMutation.mutate({ id, data: toBody(values) })
    } else {
      createMutation.mutate({ data: toBody(values) })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  if (isEdit && existing.isPending) {
    return <Spinner />
  }

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <h1 className="text-2xl font-semibold">
        {isEdit ? t('form.edit_title') : t('form.create_title')}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-8">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="client_id">{t('form.vendor')}</FieldLabel>
            <VendorSelect
              id="client_id"
              value={watch('client_id')}
              onChange={(clientId) => setValue('client_id', clientId)}
            />
            {errors.client_id && (
              <p className="text-sm text-destructive">{errors.client_id.message}</p>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <TextField
              id="supplier_invoice_number"
              label={t('form.supplier_invoice_number')}
              error={errors.supplier_invoice_number}
              {...register('supplier_invoice_number')}
            />
            <Field>
              <FieldLabel htmlFor="vat_regime">{t('form.vat_regime')}</FieldLabel>
              <Select
                value={watch('vat_regime')}
                onValueChange={(value) =>
                  setValue('vat_regime', value as SupplierInvoiceFormValues['vat_regime'])
                }
              >
                <SelectTrigger id="vat_regime">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VAT_REGIMES.map((regime) => (
                    <SelectItem key={regime} value={regime}>
                      {t(`vat_regime.${regime}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <TextField
              id="issued_at"
              type="date"
              label={t('form.issued_at')}
              error={errors.issued_at}
              {...register('issued_at')}
            />
            <TextField
              id="taxable_supply_at"
              type="date"
              label={t('form.taxable_supply_at')}
              error={errors.taxable_supply_at}
              {...register('taxable_supply_at')}
            />
            <TextField
              id="due_at"
              type="date"
              label={t('form.due_at')}
              error={errors.due_at}
              {...register('due_at')}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <TextField
              id="received_at"
              type="date"
              label={t('form.received_at')}
              error={errors.received_at}
              {...register('received_at')}
            />
            <Field>
              <FieldLabel htmlFor="currency">{t('form.currency')}</FieldLabel>
              <Select
                value={watch('currency')}
                onValueChange={(value) =>
                  setValue('currency', value as SupplierInvoiceFormValues['currency'])
                }
              >
                <SelectTrigger id="currency">
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
            <TextField
              id="exchange_rate"
              label={t('form.exchange_rate')}
              error={errors.exchange_rate}
              {...register('exchange_rate')}
            />
          </div>

          <TextField
            id="variable_symbol"
            label={t('form.variable_symbol')}
            error={errors.variable_symbol}
            {...register('variable_symbol')}
          />

          <Field>
            <FieldLabel htmlFor="note">{t('form.note')}</FieldLabel>
            <Textarea id="note" {...register('note')} />
          </Field>
        </FieldGroup>

        <FieldGroup>
          <h2 className="text-lg font-medium">{t('form.section_account')}</h2>
          <div className="grid grid-cols-2 gap-3">
            <TextField
              id="vendor_account_number"
              label={t('form.vendor_account_number')}
              error={errors.vendor_account_number}
              {...register('vendor_account_number')}
            />
            <TextField
              id="vendor_bank_code"
              label={t('form.vendor_bank_code')}
              error={errors.vendor_bank_code}
              {...register('vendor_bank_code')}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField
              id="vendor_iban"
              label={t('form.vendor_iban')}
              error={errors.vendor_iban}
              {...register('vendor_iban')}
            />
            <TextField
              id="vendor_bic"
              label={t('form.vendor_bic')}
              error={errors.vendor_bic}
              {...register('vendor_bic')}
            />
          </div>
        </FieldGroup>

        <FieldGroup>
          <h2 className="text-lg font-medium">{t('form.section_vat')}</h2>
          <VatLinesEditor control={control} errors={errors} currency={watch('currency')} editable />
        </FieldGroup>

        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {tCommon('save')}
          </Button>
          <Button type="button" variant="outline" onClick={() => void navigate(-1)}>
            {tCommon('cancel')}
          </Button>
        </div>
      </form>
    </div>
  )
}
