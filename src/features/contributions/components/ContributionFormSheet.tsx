import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import {
  useGetContributionsContribution,
  usePostContributions,
  usePutContributionsContribution,
} from '@/api/generated/taxation/taxation'
import {
  PostContributionsBodyCurrency,
  PostContributionsBodyType,
  type PostContributionsBody,
} from '@/api/generated/qASAAPIDocumentation.schemas'
import { TextField } from '@/shared/components/TextField'
import { applyLaravelErrors } from '@/shared/lib/laravel-errors'
import { normalizeMoneyInput } from '@/shared/lib/money'
import { queryClient } from '@/shared/lib/query-client'
import { Button } from '@/shared/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/shared/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/shared/ui/sheet'
import { Spinner } from '@/shared/ui/spinner'
import { Textarea } from '@/shared/ui/textarea'

const TYPES = Object.values(PostContributionsBodyType)
const CURRENCIES = Object.values(PostContributionsBodyCurrency)

interface FormValues {
  type: PostContributionsBodyType
  period_year: string
  period_month: string
  amount: string
  currency: PostContributionsBodyCurrency
  paid_at: string
  note: string
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function defaultValues(): FormValues {
  return {
    type: PostContributionsBodyType.social,
    period_year: String(new Date().getFullYear()),
    period_month: '',
    amount: '',
    currency: PostContributionsBodyCurrency.EUR,
    paid_at: todayIso(),
    note: '',
  }
}

interface ContributionFormSheetProps {
  contributionId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ContributionFormSheet({
  contributionId,
  open,
  onOpenChange,
}: ContributionFormSheetProps) {
  const { t } = useTranslation('contributions')
  const { t: tCommon } = useTranslation()
  const isEdit = Boolean(contributionId)

  const existing = useGetContributionsContribution(contributionId ?? '', {
    query: { enabled: isEdit && open },
  })

  const schema = z.object({
    type: z.enum(TYPES),
    period_year: z.string().refine((v) => Number(v) >= 2000 && Number(v) <= 2100, {
      message: t('validation.period_year_invalid'),
    }),
    period_month: z.string(),
    amount: z.string().refine((v) => Number(normalizeMoneyInput(v)) > 0, {
      message: t('validation.amount_positive'),
    }),
    currency: z.enum(CURRENCIES),
    paid_at: z.string().min(1, t('validation.paid_at_required')),
    note: z.string(),
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(),
  })

  useEffect(() => {
    if (!open) return
    const contribution = existing.data?.data
    if (contribution) {
      reset({
        type: (contribution.type ?? 'social') as PostContributionsBodyType,
        period_year: String(contribution.period_year ?? new Date().getFullYear()),
        period_month: contribution.period_month != null ? String(contribution.period_month) : '',
        amount: contribution.amount != null ? String(contribution.amount) : '',
        currency: (contribution.currency ?? 'EUR') as PostContributionsBodyCurrency,
        paid_at: contribution.paid_at ?? todayIso(),
        note: contribution.note ?? '',
      })
    } else if (!isEdit) {
      reset(defaultValues())
    }
  }, [open, existing.data, isEdit, reset])

  const invalidateList = () =>
    void queryClient.invalidateQueries({ queryKey: ['/api/v1/contributions'] })

  const createMutation = usePostContributions({
    mutation: {
      onSuccess: () => {
        invalidateList()
        toast.success(t('form.created'))
        onOpenChange(false)
      },
      onError: (error) => {
        const message = applyLaravelErrors(error, setError)
        if (message) toast.error(message)
      },
    },
  })

  const updateMutation = usePutContributionsContribution({
    mutation: {
      onSuccess: () => {
        invalidateList()
        void queryClient.invalidateQueries({
          queryKey: [`/api/v1/contributions/${contributionId}`],
        })
        toast.success(t('form.updated'))
        onOpenChange(false)
      },
      onError: (error) => {
        const message = applyLaravelErrors(error, setError)
        if (message) toast.error(message)
      },
    },
  })

  const toBody = (values: FormValues): PostContributionsBody => ({
    type: values.type,
    period_year: Number(values.period_year),
    period_month: values.period_month ? Number(values.period_month) : null,
    amount: Number(normalizeMoneyInput(values.amount)),
    currency: values.currency,
    paid_at: values.paid_at,
    note: values.note || null,
  })

  const onSubmit: SubmitHandler<FormValues> = (values) => {
    if (isEdit && contributionId) {
      updateMutation.mutate({ contribution: contributionId, data: toBody(values) })
    } else {
      createMutation.mutate({ data: toBody(values) })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEdit ? t('form.edit_title') : t('form.create_title')}</SheetTitle>
        </SheetHeader>
        {isEdit && existing.isPending ? (
          <div className="flex justify-center p-6">
            <Spinner />
          </div>
        ) : (
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="flex flex-1 flex-col gap-4 overflow-y-auto px-4"
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="contribution-type">{t('form.type')}</FieldLabel>
                <Select
                  value={watch('type')}
                  onValueChange={(value) => setValue('type', value as PostContributionsBodyType)}
                >
                  <SelectTrigger id="contribution-type">
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

              <div className="grid grid-cols-2 gap-3">
                <TextField
                  id="contribution-period-year"
                  type="number"
                  label={t('form.period_year')}
                  error={errors.period_year}
                  {...register('period_year')}
                />
                <TextField
                  id="contribution-period-month"
                  type="number"
                  min={1}
                  max={12}
                  label={t('form.period_month')}
                  {...register('period_month')}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <TextField
                  id="contribution-amount"
                  label={t('form.amount')}
                  error={errors.amount}
                  {...register('amount')}
                />
                <Field>
                  <FieldLabel htmlFor="contribution-currency">{t('form.currency')}</FieldLabel>
                  <Select
                    value={watch('currency')}
                    onValueChange={(value) =>
                      setValue('currency', value as PostContributionsBodyCurrency)
                    }
                  >
                    <SelectTrigger id="contribution-currency">
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

              <TextField
                id="contribution-paid-at"
                type="date"
                label={t('form.paid_at')}
                error={errors.paid_at}
                {...register('paid_at')}
              />

              <Field>
                <FieldLabel htmlFor="contribution-note">{t('form.note')}</FieldLabel>
                <Textarea id="contribution-note" {...register('note')} />
              </Field>
            </FieldGroup>

            <SheetFooter className="mt-auto flex-row justify-end border-t px-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {tCommon('cancel')}
              </Button>
              <Button type="submit" disabled={isPending}>
                {tCommon('save')}
              </Button>
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  )
}
