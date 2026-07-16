import { zodResolver } from '@hookform/resolvers/zod'
import { PlusIcon, TrashIcon } from 'lucide-react'
import { useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import {
  useDeleteExchangeRatesExchangeRate,
  useGetExchangeRates,
  usePostExchangeRates,
} from '@/api/generated/exchange-rates/exchange-rates'
import {
  PostExchangeRatesBodyBaseCurrency,
  PostExchangeRatesBodyTargetCurrency,
} from '@/api/generated/qASAAPIDocumentation.schemas'
import { DateText } from '@/shared/components/DateText'
import { TextField } from '@/shared/components/TextField'
import { applyLaravelErrors, extractErrorMessage } from '@/shared/lib/laravel-errors'
import { queryClient } from '@/shared/lib/query-client'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/shared/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

const CURRENCIES = Object.values(PostExchangeRatesBodyBaseCurrency)

export function ExchangeRatesPage() {
  const { t } = useTranslation('settings')
  const [dialogOpen, setDialogOpen] = useState(false)

  const rates = useGetExchangeRates()

  const remove = useDeleteExchangeRatesExchangeRate({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ['/api/v1/exchange-rates'] })
        toast.success(t('exchange_rates.deleted'))
      },
      onError: (error) => {
        toast.error(extractErrorMessage(error) ?? t('exchange_rates.system_rate_not_deletable'))
      },
    },
  })

  const rows = rates.data?.data ?? []

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('exchange_rates.title')}</h1>
        <Button type="button" onClick={() => setDialogOpen(true)}>
          <PlusIcon />
          {t('exchange_rates.new_rate')}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('exchange_rates.column_pair')}</TableHead>
            <TableHead>{t('exchange_rates.column_rate')}</TableHead>
            <TableHead>{t('exchange_rates.column_date')}</TableHead>
            <TableHead>{t('exchange_rates.column_source')}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                {t('exchange_rates.empty')}
              </TableCell>
            </TableRow>
          )}
          {rows.map((rate) => (
            <TableRow key={rate.id}>
              <TableCell className="font-medium">
                {rate.base_currency}/{rate.target_currency}
              </TableCell>
              <TableCell>{rate.rate}</TableCell>
              <TableCell>
                <DateText value={rate.date} variant="date-only" />
              </TableCell>
              <TableCell>{rate.source ? t(`exchange_rates.source.${rate.source}`) : '—'}</TableCell>
              <TableCell className="flex justify-end">
                {rate.source === 'manual' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    aria-label={t('exchange_rates.delete_confirm')}
                    disabled={remove.isPending}
                    onClick={() => {
                      if (rate.id && window.confirm(t('exchange_rates.delete_confirm'))) {
                        remove.mutate({ exchangeRate: rate.id })
                      }
                    }}
                  >
                    <TrashIcon />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ExchangeRateDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  )
}

interface ExchangeRateFormValues {
  base_currency: PostExchangeRatesBodyBaseCurrency
  target_currency: PostExchangeRatesBodyTargetCurrency
  rate: string
  date: string
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function defaultValues(): ExchangeRateFormValues {
  return {
    base_currency: PostExchangeRatesBodyBaseCurrency.EUR,
    target_currency: PostExchangeRatesBodyTargetCurrency.CZK,
    rate: '',
    date: todayIso(),
  }
}

function ExchangeRateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation('settings')
  const { t: tCommon } = useTranslation()

  const schema = z.object({
    base_currency: z.enum(CURRENCIES),
    target_currency: z.enum(CURRENCIES),
    rate: z.string().refine((value) => Number(value) > 0, { message: t('exchange_rates.rate') }),
    date: z.string().min(1),
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm<ExchangeRateFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(),
  })

  const createMutation = usePostExchangeRates({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ['/api/v1/exchange-rates'] })
        toast.success(t('exchange_rates.created'))
        reset(defaultValues())
        onClose()
      },
      onError: (error) => {
        const message = applyLaravelErrors(error, setError)
        if (message) toast.error(message)
      },
    },
  })

  const onSubmit: SubmitHandler<ExchangeRateFormValues> = (values) => {
    if (values.base_currency === values.target_currency) {
      setError('target_currency', { message: t('exchange_rates.currencies_must_differ') })
      return
    }
    createMutation.mutate({
      data: {
        base_currency: values.base_currency,
        target_currency: values.target_currency,
        rate: Number(values.rate),
        date: values.date,
      },
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          reset(defaultValues())
          onClose()
        }
      }}
    >
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogHeader>
            <DialogTitle>{t('exchange_rates.create_title')}</DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="er-base">{t('exchange_rates.base_currency')}</FieldLabel>
                <Select
                  value={watch('base_currency')}
                  onValueChange={(value) =>
                    setValue('base_currency', value as PostExchangeRatesBodyBaseCurrency)
                  }
                >
                  <SelectTrigger id="er-base">
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
                <FieldLabel htmlFor="er-target">{t('exchange_rates.target_currency')}</FieldLabel>
                <Select
                  value={watch('target_currency')}
                  onValueChange={(value) =>
                    setValue('target_currency', value as PostExchangeRatesBodyTargetCurrency)
                  }
                >
                  <SelectTrigger id="er-target">
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
                {errors.target_currency && (
                  <p className="text-sm text-destructive">{errors.target_currency.message}</p>
                )}
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextField
                id="er-rate"
                type="number"
                step="0.000001"
                label={t('exchange_rates.rate')}
                error={errors.rate}
                {...register('rate')}
              />
              <TextField
                id="er-date"
                type="date"
                label={t('exchange_rates.date')}
                error={errors.date}
                {...register('date')}
              />
            </div>
            <p className="text-xs text-muted-foreground">{t('exchange_rates.upsert_hint')}</p>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {tCommon('cancel')}
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {tCommon('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
