import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { useEffect, useMemo } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'

import { useGetBankAccounts } from '@/api/generated/bank-accounts/bank-accounts'
import {
  useGetInvoicesId,
  usePatchInvoicesId,
  usePostInvoices,
} from '@/api/generated/invoices/invoices'
import {
  PatchInvoicesIdBodyCurrency,
  PostInvoicesBodyCurrency,
  PostInvoicesBodyType,
  type Invoice,
  type PatchInvoicesIdBody,
  type PostInvoicesBody,
} from '@/api/generated/qASAAPIDocumentation.schemas'
import { ClientSelect } from '@/features/invoicing/components/ClientSelect'
import { isEditable } from '@/features/invoicing/lib/status-transitions'
import { Spinner } from '@/shared/ui/spinner'
import { TextField } from '@/shared/components/TextField'
import { applyLaravelErrors } from '@/shared/lib/laravel-errors'
import { useIdempotencyKey } from '@/shared/lib/idempotency'
import { normalizeMoneyInput } from '@/shared/lib/money'
import { queryClient } from '@/shared/lib/query-client'
import { Button } from '@/shared/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/shared/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Textarea } from '@/shared/ui/textarea'

const CURRENCIES = Object.values(PostInvoicesBodyCurrency)
const TYPES = Object.values(PostInvoicesBodyType)

interface InvoiceFormValues {
  client_id: string
  issued_at: string
  due_at: string
  currency: PostInvoicesBodyCurrency
  type: Exclude<PostInvoicesBodyType, null>
  taxable_supply_at: string
  variable_symbol: string
  bank_account_id: string
  discount_percent: string
  note: string
  note_above: string
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function defaultValues(): InvoiceFormValues {
  return {
    client_id: '',
    issued_at: todayIso(),
    due_at: todayIso(),
    currency: PostInvoicesBodyCurrency.EUR,
    type: PostInvoicesBodyType.invoice,
    taxable_supply_at: '',
    variable_symbol: '',
    bank_account_id: '',
    discount_percent: '',
    note: '',
    note_above: '',
  }
}

function invoiceToFormValues(invoice: Invoice): InvoiceFormValues {
  return {
    client_id: invoice.client?.id ?? '',
    issued_at: invoice.issued_at ?? todayIso(),
    due_at: invoice.due_at ?? todayIso(),
    currency: (invoice.currency ?? PostInvoicesBodyCurrency.EUR) as PostInvoicesBodyCurrency,
    type: PostInvoicesBodyType.invoice,
    taxable_supply_at: invoice.taxable_supply_at ?? '',
    variable_symbol: invoice.variable_symbol ?? '',
    bank_account_id: invoice.bank_account_id ?? '',
    discount_percent: invoice.discount_percent != null ? String(invoice.discount_percent) : '',
    note: invoice.note ?? '',
    note_above: invoice.note_above ?? '',
  }
}

export function InvoiceFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { t } = useTranslation('invoices')
  const { t: tCommon } = useTranslation()
  const idempotency = useIdempotencyKey()

  const existing = useGetInvoicesId(id ?? '', { query: { enabled: isEdit } })
  const bankAccounts = useGetBankAccounts()

  useEffect(() => {
    if (isEdit && existing.data && !isEditable(existing.data.status ?? 'draft')) {
      toast.error(t('form.not_editable'))
      void navigate(`/invoices/${id}`, { replace: true })
    }
  }, [existing.data, id, isEdit, navigate, t])

  const schema = useMemo(
    () =>
      z
        .object({
          client_id: z.string().min(1, t('validation.client_required')),
          issued_at: z.string().min(1),
          due_at: z.string().min(1),
          currency: z.enum(CURRENCIES),
          type: z.enum(TYPES),
          taxable_supply_at: z.string(),
          variable_symbol: z.string().regex(/^\d{0,10}$/, t('validation.variable_symbol')),
          bank_account_id: z.string(),
          discount_percent: z.string(),
          note: z.string().max(2000),
          note_above: z.string().max(2000),
        })
        .refine((data) => data.due_at >= data.issued_at, {
          path: ['due_at'],
          message: t('validation.due_at_after_issued_at'),
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
    formState: { errors },
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(),
  })

  useEffect(() => {
    if (existing.data) {
      reset(invoiceToFormValues(existing.data))
    }
  }, [existing.data, reset])

  const sharedFields = (values: InvoiceFormValues) => ({
    client_id: values.client_id,
    issued_at: values.issued_at,
    due_at: values.due_at,
    currency: values.currency,
    taxable_supply_at: values.taxable_supply_at || null,
    variable_symbol: values.variable_symbol || null,
    bank_account_id: values.bank_account_id || null,
    discount_percent: values.discount_percent
      ? Number(normalizeMoneyInput(values.discount_percent))
      : null,
    note: values.note || null,
    note_above: values.note_above || null,
  })

  const toCreateBody = (values: InvoiceFormValues): PostInvoicesBody => ({
    ...sharedFields(values),
    type: values.type,
  })

  const toUpdateBody = (values: InvoiceFormValues): PatchInvoicesIdBody => ({
    ...sharedFields(values),
    currency: values.currency as PatchInvoicesIdBodyCurrency,
    expected_updated_at: existing.data?.updated_at ?? null,
  })

  const createMutation = usePostInvoices({
    request: { headers: { 'Idempotency-Key': idempotency.get() } },
    mutation: {
      onSuccess: (invoice) => {
        void queryClient.invalidateQueries({ queryKey: ['/api/v1/invoices'] })
        idempotency.reset()
        toast.success(t('form.created'))
        void navigate(`/invoices/${invoice.id}`)
      },
      onError: (error) => {
        const message = applyLaravelErrors(error, setError)
        if (message) toast.error(message)
      },
    },
  })

  const updateMutation = usePatchInvoicesId({
    mutation: {
      onSuccess: (invoice) => {
        void queryClient.invalidateQueries({ queryKey: ['/api/v1/invoices'] })
        toast.success(t('form.updated'))
        void navigate(`/invoices/${invoice.id}`)
      },
      onError: (error) => {
        if (isAxiosError(error) && error.response?.status === 409) {
          toast.error(t('form.conflict'))
          return
        }
        const message = applyLaravelErrors(error, setError)
        if (message) toast.error(message)
      },
    },
  })

  const onSubmit: SubmitHandler<InvoiceFormValues> = (values) => {
    if (isEdit && id) {
      updateMutation.mutate({ id, data: toUpdateBody(values) })
    } else {
      createMutation.mutate({ data: toCreateBody(values) })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  if (isEdit && existing.isPending) {
    return <Spinner />
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">
        {isEdit ? t('form.edit_title') : t('form.create_title')}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="client_id">{t('form.client')}</FieldLabel>
            <ClientSelect
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
              id="issued_at"
              type="date"
              label={t('form.issued_at')}
              error={errors.issued_at}
              {...register('issued_at')}
            />
            <TextField
              id="due_at"
              type="date"
              label={t('form.due_at')}
              error={errors.due_at}
              {...register('due_at')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="currency">{t('form.currency')}</FieldLabel>
              <Select
                value={watch('currency')}
                onValueChange={(value) => setValue('currency', value as PostInvoicesBodyCurrency)}
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
            <Field>
              <FieldLabel htmlFor="type">{t('form.type')}</FieldLabel>
              <Select
                value={watch('type')}
                onValueChange={(value) =>
                  setValue('type', value as Exclude<PostInvoicesBodyType, null>)
                }
                disabled={isEdit}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`type.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <TextField
            id="taxable_supply_at"
            type="date"
            label={t('form.taxable_supply_at')}
            error={errors.taxable_supply_at}
            {...register('taxable_supply_at')}
          />

          <div className="grid grid-cols-2 gap-3">
            <TextField
              id="variable_symbol"
              label={t('form.variable_symbol')}
              error={errors.variable_symbol}
              {...register('variable_symbol')}
            />
            <TextField
              id="discount_percent"
              label={t('form.discount_percent')}
              error={errors.discount_percent}
              {...register('discount_percent')}
            />
          </div>

          <Field>
            <FieldLabel htmlFor="bank_account_id">{t('form.bank_account')}</FieldLabel>
            <Select
              value={watch('bank_account_id') || 'none'}
              onValueChange={(value) => setValue('bank_account_id', value === 'none' ? '' : value)}
            >
              <SelectTrigger id="bank_account_id">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('form.bank_account_none')}</SelectItem>
                {bankAccounts.data?.map(
                  (account) =>
                    account.id && (
                      <SelectItem key={account.id} value={account.id}>
                        {account.label ?? account.iban ?? account.account_number}
                      </SelectItem>
                    ),
                )}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="note_above">{t('form.note_above')}</FieldLabel>
            <Textarea id="note_above" {...register('note_above')} />
          </Field>

          <Field>
            <FieldLabel htmlFor="note">{t('form.note')}</FieldLabel>
            <Textarea id="note" {...register('note')} />
          </Field>

          <div className="flex gap-2">
            <Button type="submit" disabled={isPending}>
              {tCommon('save')}
            </Button>
            <Button type="button" variant="outline" onClick={() => void navigate(-1)}>
              {tCommon('cancel')}
            </Button>
          </div>
        </FieldGroup>
      </form>
    </div>
  )
}
