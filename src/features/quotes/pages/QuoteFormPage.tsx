import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'

import { useGetQuotesId, usePostQuotes, usePutQuotesId } from '@/api/generated/quotes/quotes'
import {
  PostQuotesBodyCurrency,
  type PostQuotesBody,
  type PutQuotesIdBody,
  type Quote,
} from '@/api/generated/qASAAPIDocumentation.schemas'
import { ClientSelect } from '@/features/quotes/components/ClientSelect'
import { isQuoteEditable } from '@/shared/lib/transitions'
import { Spinner } from '@/shared/ui/spinner'
import { TextField } from '@/shared/components/TextField'
import { applyLaravelErrors } from '@/shared/lib/laravel-errors'
import { normalizeMoneyInput } from '@/shared/lib/money'
import { queryClient } from '@/shared/lib/query-client'
import { Button } from '@/shared/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/shared/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Textarea } from '@/shared/ui/textarea'

const CURRENCIES = Object.values(PostQuotesBodyCurrency)

interface QuoteFormValues {
  client_id: string
  issued_at: string
  valid_until: string
  currency: PostQuotesBodyCurrency
  discount_percent: string
  note: string
  note_above: string
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function defaultValues(): QuoteFormValues {
  return {
    client_id: '',
    issued_at: todayIso(),
    valid_until: '',
    currency: PostQuotesBodyCurrency.EUR,
    discount_percent: '',
    note: '',
    note_above: '',
  }
}

function quoteToFormValues(quote: Quote): QuoteFormValues {
  return {
    client_id: quote.client?.id ?? '',
    issued_at: quote.issued_at ?? todayIso(),
    valid_until: quote.valid_until ?? '',
    currency: (quote.currency ?? PostQuotesBodyCurrency.EUR) as PostQuotesBodyCurrency,
    discount_percent: quote.discount_percent != null ? String(quote.discount_percent) : '',
    note: quote.note ?? '',
    note_above: quote.note_above ?? '',
  }
}

export function QuoteFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { t } = useTranslation('quotes')
  const { t: tCommon } = useTranslation()

  const existing = useGetQuotesId(id ?? '', { query: { enabled: isEdit } })

  useEffect(() => {
    if (isEdit && existing.data && !isQuoteEditable(existing.data.status ?? 'draft')) {
      toast.error(t('form.not_editable'))
      void navigate(`/quotes/${id}`, { replace: true })
    }
  }, [existing.data, id, isEdit, navigate, t])

  const schema = useMemo(
    () =>
      z
        .object({
          client_id: z.string().min(1, t('validation.client_required')),
          issued_at: z.string().min(1),
          valid_until: z.string(),
          currency: z.enum(CURRENCIES),
          discount_percent: z.string(),
          note: z.string().max(2000),
          note_above: z.string().max(2000),
        })
        .refine((data) => !data.valid_until || data.valid_until >= data.issued_at, {
          path: ['valid_until'],
          message: t('validation.valid_until_after_issued_at'),
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
  } = useForm<QuoteFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(),
  })

  useEffect(() => {
    if (existing.data) {
      reset(quoteToFormValues(existing.data))
    }
  }, [existing.data, reset])

  const toBody = (values: QuoteFormValues): PostQuotesBody => ({
    client_id: values.client_id,
    issued_at: values.issued_at,
    currency: values.currency,
    valid_until: values.valid_until || null,
    discount_percent: values.discount_percent
      ? Number(normalizeMoneyInput(values.discount_percent))
      : null,
    note: values.note || null,
    note_above: values.note_above || null,
  })

  const createMutation = usePostQuotes({
    mutation: {
      onSuccess: (quote) => {
        void queryClient.invalidateQueries({ queryKey: ['/api/v1/quotes'] })
        toast.success(t('form.created'))
        void navigate(`/quotes/${quote.id}`)
      },
      onError: (error) => {
        const message = applyLaravelErrors(error, setError)
        if (message) toast.error(message)
      },
    },
  })

  const updateMutation = usePutQuotesId({
    mutation: {
      onSuccess: (quote) => {
        void queryClient.invalidateQueries({ queryKey: ['/api/v1/quotes'] })
        toast.success(t('form.updated'))
        void navigate(`/quotes/${quote.id}`)
      },
      onError: (error) => {
        const message = applyLaravelErrors(error, setError)
        if (message) toast.error(message)
      },
    },
  })

  const onSubmit: SubmitHandler<QuoteFormValues> = (values) => {
    if (isEdit && id) {
      updateMutation.mutate({ id, data: toBody(values) as PutQuotesIdBody })
    } else {
      createMutation.mutate({ data: toBody(values) })
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
              id="valid_until"
              type="date"
              label={t('form.valid_until')}
              error={errors.valid_until}
              {...register('valid_until')}
            />
          </div>

          <Field>
            <FieldLabel htmlFor="currency">{t('form.currency')}</FieldLabel>
            <Select
              value={watch('currency')}
              onValueChange={(value) => setValue('currency', value as PostQuotesBodyCurrency)}
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
            id="discount_percent"
            label={t('form.discount_percent')}
            error={errors.discount_percent}
            {...register('discount_percent')}
          />

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
