import { zodResolver } from '@hookform/resolvers/zod'
import { PencilIcon, PlusIcon, TrashIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import {
  useDeleteVatRatesId,
  useGetVatRates,
  usePostVatRates,
  usePutVatRatesId,
} from '@/api/generated/vat-rates/vat-rates'
import type { PostVatRatesBody, VatRate } from '@/api/generated/qASAAPIDocumentation.schemas'
import { DateText } from '@/shared/components/DateText'
import { TextField } from '@/shared/components/TextField'
import { applyLaravelErrors } from '@/shared/lib/laravel-errors'
import { queryClient } from '@/shared/lib/query-client'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/shared/ui/field'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

export function VatRatesPage() {
  const { t } = useTranslation('settings')
  const { t: tCommon } = useTranslation()
  const [dialogTarget, setDialogTarget] = useState<VatRate | null | undefined>(undefined)

  const rates = useGetVatRates()

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['/api/v1/vat-rates'] })

  const remove = useDeleteVatRatesId({
    mutation: {
      onSuccess: () => {
        void invalidate()
        toast.success(t('vat_rates.deleted'))
      },
    },
  })

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('vat_rates.title')}</h1>
        <Button type="button" onClick={() => setDialogTarget(null)}>
          <PlusIcon />
          {t('vat_rates.new_rate')}
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('vat_rates.column_code')}</TableHead>
            <TableHead>{t('vat_rates.column_country')}</TableHead>
            <TableHead>{t('vat_rates.column_rate')}</TableHead>
            <TableHead>{t('vat_rates.column_validity')}</TableHead>
            <TableHead>{t('vat_rates.column_default')}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {(rates.data ?? []).length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                {t('vat_rates.empty')}
              </TableCell>
            </TableRow>
          )}
          {(rates.data ?? []).map((rate) => (
            <TableRow key={rate.id}>
              <TableCell className="font-medium">{rate.label ?? rate.code}</TableCell>
              <TableCell>{rate.country}</TableCell>
              <TableCell>{rate.rate}%</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {rate.valid_from && <DateText value={rate.valid_from} variant="date-only" />}
                {rate.valid_from && rate.valid_to && ' – '}
                {rate.valid_to && <DateText value={rate.valid_to} variant="date-only" />}
              </TableCell>
              <TableCell>{rate.is_default && <Badge>✓</Badge>}</TableCell>
              <TableCell className="flex justify-end gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={tCommon('edit')}
                  onClick={() => setDialogTarget(rate)}
                >
                  <PencilIcon />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  aria-label={tCommon('delete')}
                  onClick={() => {
                    if (rate.id !== undefined && window.confirm(t('vat_rates.delete_confirm'))) {
                      remove.mutate({ id: rate.id })
                    }
                  }}
                >
                  <TrashIcon />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <VatRateDialog
        target={dialogTarget}
        onClose={() => setDialogTarget(undefined)}
        onSaved={() => void invalidate()}
      />
    </div>
  )
}

interface VatRateFormValues {
  code: string
  country: string
  rate: string
  label: string
  is_default: boolean
  valid_from: string
  valid_to: string
}

function rateToFormValues(rate?: VatRate | null): VatRateFormValues {
  return {
    code: rate?.code ?? '',
    country: rate?.country ?? '',
    rate: rate?.rate?.toString() ?? '',
    label: rate?.label ?? '',
    is_default: rate?.is_default ?? false,
    valid_from: rate?.valid_from ?? '',
    valid_to: rate?.valid_to ?? '',
  }
}

function toRequestBody(values: VatRateFormValues): PostVatRatesBody {
  const orNull = (value: string) => (value.trim() ? value.trim() : null)
  return {
    code: values.code.trim(),
    country: values.country.trim().toUpperCase(),
    rate: Number(values.rate),
    label: orNull(values.label),
    is_default: values.is_default,
    valid_from: orNull(values.valid_from),
    valid_to: orNull(values.valid_to),
  }
}

interface VatRateDialogProps {
  target: VatRate | null | undefined
  onClose: () => void
  onSaved: () => void
}

function VatRateDialog({ target, onClose, onSaved }: VatRateDialogProps) {
  const { t } = useTranslation('settings')
  const { t: tCommon } = useTranslation()
  const isEdit = Boolean(target?.id)
  const open = target !== undefined

  const schema = z.object({
    code: z.string().min(1).max(10),
    country: z.string().length(2),
    rate: z.string().refine((value) => value !== '' && !Number.isNaN(Number(value)), {
      message: t('vat_rates.rate'),
    }),
    label: z.string(),
    is_default: z.boolean(),
    valid_from: z.string(),
    valid_to: z.string(),
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm<VatRateFormValues>({
    resolver: zodResolver(schema),
    defaultValues: rateToFormValues(target),
  })

  useEffect(() => {
    if (open) reset(rateToFormValues(target))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, target])

  const createMutation = usePostVatRates({
    mutation: {
      onSuccess: () => {
        toast.success(t('vat_rates.created'))
        onSaved()
        onClose()
      },
      onError: (error) => {
        const message = applyLaravelErrors(error, setError)
        if (message) toast.error(message)
      },
    },
  })

  const updateMutation = usePutVatRatesId({
    mutation: {
      onSuccess: () => {
        toast.success(t('vat_rates.updated'))
        onSaved()
        onClose()
      },
      onError: (error) => {
        const message = applyLaravelErrors(error, setError)
        if (message) toast.error(message)
      },
    },
  })

  const onSubmit: SubmitHandler<VatRateFormValues> = (values) => {
    const body = toRequestBody(values)
    if (isEdit && target?.id) {
      updateMutation.mutate({ id: target.id, data: body })
    } else {
      createMutation.mutate({ data: body })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? t('vat_rates.edit_title') : t('vat_rates.create_title')}
            </DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <div className="grid grid-cols-2 gap-3">
              <TextField
                id="vr-code"
                label={t('vat_rates.code')}
                error={errors.code}
                {...register('code')}
              />
              <TextField
                id="vr-country"
                label={t('vat_rates.country')}
                maxLength={2}
                error={errors.country}
                {...register('country')}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextField
                id="vr-rate"
                type="number"
                step="0.01"
                label={t('vat_rates.rate')}
                error={errors.rate}
                {...register('rate')}
              />
              <TextField id="vr-label" label={t('vat_rates.label')} {...register('label')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextField
                id="vr-valid-from"
                type="date"
                label={t('vat_rates.valid_from')}
                {...register('valid_from')}
              />
              <TextField
                id="vr-valid-to"
                type="date"
                label={t('vat_rates.valid_to')}
                {...register('valid_to')}
              />
            </div>
            <Field orientation="horizontal">
              <Checkbox
                id="vr-is-default"
                checked={watch('is_default')}
                onCheckedChange={(checked) => setValue('is_default', checked === true)}
              />
              <FieldLabel htmlFor="vr-is-default">{t('vat_rates.is_default')}</FieldLabel>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {tCommon('cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {tCommon('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
