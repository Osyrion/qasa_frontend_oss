import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'

import {
  useGetRecurringInvoiceTemplatesId,
  usePostRecurringInvoiceTemplates,
  usePutRecurringInvoiceTemplatesId,
} from '@/api/generated/recurring-invoice-templates/recurring-invoice-templates'
import {
  PostRecurringInvoiceTemplatesBodyCurrency,
  PostRecurringInvoiceTemplatesBodyPeriod,
  PostRecurringInvoiceTemplatesBodyTaxDateMode,
  PostRecurringInvoiceTemplatesBodyType,
  type PostRecurringInvoiceTemplatesBody,
  type RecurringInvoiceTemplate,
} from '@/api/generated/qASAAPIDocumentation.schemas'
import { ClientSelect } from '@/features/recurring/components/ClientSelect'
import { PlaceholderPreviewInput } from '@/features/recurring/components/PlaceholderPreviewInput'
import { RecurringItemsFieldArray } from '@/features/recurring/components/RecurringItemsFieldArray'
import type { RecurringFormValues } from '@/features/recurring/lib/form-values'
import { applyLaravelErrors } from '@/shared/lib/laravel-errors'
import { normalizeMoneyInput } from '@/shared/lib/money'
import { queryClient } from '@/shared/lib/query-client'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import { Field, FieldGroup, FieldLabel } from '@/shared/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Spinner } from '@/shared/ui/spinner'
import { Switch } from '@/shared/ui/switch'
import { TextField } from '@/shared/components/TextField'

const PERIODS = Object.values(PostRecurringInvoiceTemplatesBodyPeriod)
const TYPES = Object.values(PostRecurringInvoiceTemplatesBodyType)
const TAX_DATE_MODES = Object.values(PostRecurringInvoiceTemplatesBodyTaxDateMode)
const CURRENCIES = Object.values(PostRecurringInvoiceTemplatesBodyCurrency)

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function defaultValues(): RecurringFormValues {
  return {
    name: '',
    client_id: '',
    period: 'monthly',
    day_of_month: '1',
    last_day_of_month: false,
    first_issue_date: todayIso(),
    end_date: '',
    type: 'invoice',
    currency: 'EUR',
    due_days: '14',
    discount_percent: '',
    reverse_charge: false,
    tax_date_mode: 'issue_date',
    auto_send: false,
    note_above: '',
    note_below: '',
    items: [],
  }
}

function templateToFormValues(template: RecurringInvoiceTemplate): RecurringFormValues {
  return {
    name: template.name ?? '',
    client_id: template.client?.id ?? template.client_id ?? '',
    period: (template.period ?? 'monthly') as RecurringFormValues['period'],
    day_of_month: template.day_of_month != null ? String(template.day_of_month) : '1',
    last_day_of_month: template.last_day_of_month ?? false,
    first_issue_date: template.first_issue_date ?? todayIso(),
    end_date: template.end_date ?? '',
    type: (template.type ?? 'invoice') as RecurringFormValues['type'],
    currency: template.currency ?? 'EUR',
    due_days: template.due_days != null ? String(template.due_days) : '14',
    discount_percent: template.discount_percent != null ? String(template.discount_percent) : '',
    reverse_charge: template.reverse_charge ?? false,
    tax_date_mode: (template.tax_date_mode ?? 'issue_date') as RecurringFormValues['tax_date_mode'],
    auto_send: template.auto_send ?? false,
    note_above: template.note_above ?? '',
    note_below: template.note_below ?? '',
    items: (template.items ?? []).map((item) => ({
      description: item.description ?? '',
      quantity: item.quantity != null ? String(item.quantity) : '1',
      unit: item.unit ?? 'ks',
      unit_price: item.unit_price != null ? String(item.unit_price) : '',
      vat_rate: item.vat_rate != null ? String(item.vat_rate) : '0',
    })),
  }
}

export function RecurringFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { t } = useTranslation('recurring')
  const { t: tCommon } = useTranslation()

  const existing = useGetRecurringInvoiceTemplatesId(id ?? '', { query: { enabled: isEdit } })

  const schema = useMemo(
    () =>
      z
        .object({
          name: z.string().min(1, t('validation.name_required')).max(255),
          client_id: z.string().min(1, t('validation.client_required')),
          period: z.enum(PERIODS),
          day_of_month: z.string(),
          last_day_of_month: z.boolean(),
          first_issue_date: z.string().min(1, t('validation.first_issue_date_required')),
          end_date: z.string(),
          type: z.enum(TYPES),
          currency: z.enum(CURRENCIES),
          due_days: z.string(),
          discount_percent: z.string(),
          reverse_charge: z.boolean(),
          tax_date_mode: z.enum(TAX_DATE_MODES),
          auto_send: z.boolean(),
          note_above: z.string().max(2000),
          note_below: z.string().max(2000),
          items: z
            .object({
              description: z.string().min(1, t('validation.description_required')).max(500),
              quantity: z.string().refine((v) => Number(normalizeMoneyInput(v)) > 0, {
                message: t('validation.quantity_positive'),
              }),
              unit: z.string().max(20),
              unit_price: z.string().refine((v) => Number(normalizeMoneyInput(v)) >= 0, {
                message: t('validation.unit_price_non_negative'),
              }),
              vat_rate: z.string(),
            })
            .array()
            .min(1),
        })
        .refine(
          (data) =>
            data.last_day_of_month ||
            (Number(data.day_of_month) >= 1 && Number(data.day_of_month) <= 28),
          {
            path: ['day_of_month'],
            message: t('validation.day_of_month_required'),
          },
        )
        .refine((data) => !data.end_date || data.end_date >= data.first_issue_date, {
          path: ['end_date'],
          message: t('validation.end_date_after_first_issue'),
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
  } = useForm<RecurringFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(),
  })

  useEffect(() => {
    if (existing.data) {
      reset(templateToFormValues(existing.data))
    }
  }, [existing.data, reset])

  const toBody = (values: RecurringFormValues): PostRecurringInvoiceTemplatesBody => ({
    name: values.name,
    client_id: values.client_id,
    period: values.period,
    day_of_month: values.last_day_of_month ? undefined : Number(values.day_of_month),
    last_day_of_month: values.last_day_of_month,
    first_issue_date: values.first_issue_date,
    end_date: values.end_date || null,
    type: values.type,
    currency: values.currency,
    due_days: Number(values.due_days),
    discount_percent: values.discount_percent
      ? Number(normalizeMoneyInput(values.discount_percent))
      : null,
    reverse_charge: values.reverse_charge,
    tax_date_mode: values.tax_date_mode,
    auto_send: values.auto_send,
    note_above: values.note_above || null,
    note_below: values.note_below || null,
    items: values.items.map((item) => ({
      description: item.description,
      quantity: Number(normalizeMoneyInput(item.quantity)),
      unit: item.unit || 'ks',
      unit_price: Number(normalizeMoneyInput(item.unit_price)),
      vat_rate: Number(item.vat_rate),
    })),
  })

  const createMutation = usePostRecurringInvoiceTemplates({
    mutation: {
      onSuccess: (template) => {
        void queryClient.invalidateQueries({ queryKey: ['/api/v1/recurring-invoice-templates'] })
        toast.success(t('form.created'))
        void navigate(`/recurring/${template.id}/edit`)
      },
      onError: (error) => {
        const message = applyLaravelErrors(error, setError)
        if (message) toast.error(message)
      },
    },
  })

  const updateMutation = usePutRecurringInvoiceTemplatesId({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ['/api/v1/recurring-invoice-templates'] })
        toast.success(t('form.updated'))
        void navigate('/recurring')
      },
      onError: (error) => {
        const message = applyLaravelErrors(error, setError)
        if (message) toast.error(message)
      },
    },
  })

  const onSubmit: SubmitHandler<RecurringFormValues> = (values) => {
    if (isEdit && id) {
      updateMutation.mutate({ id, data: toBody(values) })
    } else {
      createMutation.mutate({ data: toBody(values) })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending
  const referenceDate = watch('first_issue_date') ? new Date(watch('first_issue_date')) : undefined

  if (isEdit && existing.isPending) {
    return <Spinner />
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">
        {isEdit ? t('form.edit_title') : t('form.create_title')}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-8">
        <FieldGroup>
          <h2 className="text-lg font-medium">{t('form.section_schedule')}</h2>
          <TextField id="name" label={t('form.name')} error={errors.name} {...register('name')} />

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
            <Field>
              <FieldLabel htmlFor="period">{t('form.period')}</FieldLabel>
              <Select
                value={watch('period')}
                onValueChange={(value) =>
                  setValue('period', value as RecurringFormValues['period'])
                }
              >
                <SelectTrigger id="period">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODS.map((period) => (
                    <SelectItem key={period} value={period}>
                      {t(`period.${period}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <TextField
              id="first_issue_date"
              type="date"
              label={t('form.first_issue_date')}
              error={errors.first_issue_date}
              disabled={isEdit && Boolean(existing.data?.last_generated_at)}
              {...register('first_issue_date')}
            />
          </div>

          <div className="grid grid-cols-2 items-end gap-3">
            <TextField
              id="day_of_month"
              label={t('form.day_of_month')}
              error={errors.day_of_month}
              disabled={watch('last_day_of_month')}
              {...register('day_of_month')}
            />
            <Field orientation="horizontal">
              <Checkbox
                id="last_day_of_month"
                checked={watch('last_day_of_month')}
                onCheckedChange={(checked) => setValue('last_day_of_month', checked === true)}
              />
              <FieldLabel htmlFor="last_day_of_month">{t('form.last_day_of_month')}</FieldLabel>
            </Field>
          </div>

          <TextField
            id="end_date"
            type="date"
            label={t('form.end_date')}
            error={errors.end_date}
            {...register('end_date')}
          />

          {isEdit && existing.data && (
            <p className="text-sm text-muted-foreground">{t('form.next_run_readonly')}</p>
          )}
        </FieldGroup>

        <FieldGroup>
          <h2 className="text-lg font-medium">{t('form.section_invoice')}</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="type">{t('form.type')}</FieldLabel>
              <Select
                value={watch('type')}
                onValueChange={(value) => setValue('type', value as RecurringFormValues['type'])}
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
            <Field>
              <FieldLabel htmlFor="currency">{t('form.currency')}</FieldLabel>
              <Select
                value={watch('currency')}
                onValueChange={(value) =>
                  setValue('currency', value as RecurringFormValues['currency'])
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <TextField
              id="due_days"
              label={t('form.due_days')}
              error={errors.due_days}
              {...register('due_days')}
            />
            <TextField
              id="discount_percent"
              label={t('form.discount_percent')}
              error={errors.discount_percent}
              {...register('discount_percent')}
            />
          </div>

          <Field>
            <FieldLabel htmlFor="tax_date_mode">{t('form.tax_date_mode')}</FieldLabel>
            <Select
              value={watch('tax_date_mode')}
              onValueChange={(value) =>
                setValue('tax_date_mode', value as RecurringFormValues['tax_date_mode'])
              }
            >
              <SelectTrigger id="tax_date_mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TAX_DATE_MODES.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {t(`tax_date_mode.${mode}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field orientation="horizontal">
            <Switch
              id="reverse_charge"
              checked={watch('reverse_charge')}
              onCheckedChange={(checked) => setValue('reverse_charge', checked)}
            />
            <FieldLabel htmlFor="reverse_charge">{t('form.reverse_charge')}</FieldLabel>
          </Field>

          <Field orientation="horizontal">
            <Switch
              id="auto_send"
              checked={watch('auto_send')}
              onCheckedChange={(checked) => setValue('auto_send', checked)}
            />
            <FieldLabel htmlFor="auto_send">{t('form.auto_send')}</FieldLabel>
          </Field>

          <PlaceholderPreviewInput
            id="note_above"
            label={t('form.note_above')}
            value={watch('note_above')}
            onChange={(value) => setValue('note_above', value)}
            referenceDate={referenceDate}
          />
          <PlaceholderPreviewInput
            id="note_below"
            label={t('form.note_below')}
            value={watch('note_below')}
            onChange={(value) => setValue('note_below', value)}
            referenceDate={referenceDate}
          />
        </FieldGroup>

        <FieldGroup>
          <h2 className="text-lg font-medium">{t('form.section_items')}</h2>
          <RecurringItemsFieldArray
            control={control}
            register={register}
            errors={errors}
            currency={watch('currency')}
            referenceDate={referenceDate}
          />
          {errors.items?.root?.message && (
            <p className="text-sm text-destructive">{errors.items.root.message}</p>
          )}
        </FieldGroup>

        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {tCommon('save')}
          </Button>
          <Button type="button" variant="outline" onClick={() => void navigate('/recurring')}>
            {tCommon('cancel')}
          </Button>
        </div>
      </form>
    </div>
  )
}
