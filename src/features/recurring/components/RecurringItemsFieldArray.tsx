import { PlusIcon, TrashIcon } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import {
  Controller,
  useFieldArray,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { useGetVatRates } from '@/api/generated/vat-rates/vat-rates'
import { resolvePlaceholders } from '@/features/recurring/lib/placeholders'
import type { RecurringFormValues } from '@/features/recurring/lib/form-values'
import { formatMoney, normalizeMoneyInput } from '@/shared/lib/money'
import { Button } from '@/shared/ui/button'
import { Field, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { Textarea } from '@/shared/ui/textarea'

interface RecurringItemsFieldArrayProps {
  control: Control<RecurringFormValues>
  register: UseFormRegister<RecurringFormValues>
  errors: FieldErrors<RecurringFormValues>
  currency: string
  referenceDate?: Date
}

function emptyItem() {
  return { description: '', quantity: '1', unit: 'ks', unit_price: '', vat_rate: '0' }
}

export function RecurringItemsFieldArray({
  control,
  register,
  errors,
  currency,
  referenceDate,
}: RecurringItemsFieldArrayProps) {
  const { t, i18n } = useTranslation('recurring')
  const vatRates = useGetVatRates()
  const defaultVatRate = useMemo(() => {
    const preferred = vatRates.data?.find((rate) => rate.is_default) ?? vatRates.data?.[0]
    return preferred?.rate != null ? String(preferred.rate) : '0'
  }, [vatRates.data])

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchedItems = useWatch({ control, name: 'items' })

  useEffect(() => {
    if (fields.length === 0) {
      append({ ...emptyItem(), vat_rate: defaultVatRate })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields.length])

  return (
    <div className="flex flex-col gap-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('items.description')}</TableHead>
            <TableHead>{t('items.quantity')}</TableHead>
            <TableHead>{t('items.unit')}</TableHead>
            <TableHead>{t('items.unit_price')}</TableHead>
            <TableHead>{t('items.vat_rate')}</TableHead>
            <TableHead>{t('items.total')}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map((field, index) => {
            const rowValues = watchedItems?.[index]
            const quantity = Number(normalizeMoneyInput(rowValues?.quantity || '0')) || 0
            const unitPrice = Number(normalizeMoneyInput(rowValues?.unit_price || '0')) || 0
            const vatRate = Number(rowValues?.vat_rate || '0') || 0
            const total = quantity * unitPrice * (1 + vatRate / 100)
            const descriptionPreview = resolvePlaceholders(
              rowValues?.description ?? '',
              referenceDate,
            )

            return (
              <TableRow key={field.id}>
                <TableCell className="min-w-64 align-top">
                  <Textarea
                    aria-label={t('items.description')}
                    rows={2}
                    {...register(`items.${index}.description`)}
                  />
                  {rowValues?.description && descriptionPreview !== rowValues.description && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t('placeholders.preview')}: {descriptionPreview}
                    </p>
                  )}
                  {errors.items?.[index]?.description && (
                    <p className="text-sm text-destructive">
                      {errors.items[index]?.description?.message}
                    </p>
                  )}
                </TableCell>
                <TableCell className="w-24 align-top">
                  <Input
                    aria-label={t('items.quantity')}
                    {...register(`items.${index}.quantity`)}
                  />
                  {errors.items?.[index]?.quantity && (
                    <p className="text-sm text-destructive">
                      {errors.items[index]?.quantity?.message}
                    </p>
                  )}
                </TableCell>
                <TableCell className="w-20 align-top">
                  <Input aria-label={t('items.unit')} {...register(`items.${index}.unit`)} />
                </TableCell>
                <TableCell className="w-28 align-top">
                  <Input
                    aria-label={t('items.unit_price')}
                    {...register(`items.${index}.unit_price`)}
                  />
                  {errors.items?.[index]?.unit_price && (
                    <p className="text-sm text-destructive">
                      {errors.items[index]?.unit_price?.message}
                    </p>
                  )}
                </TableCell>
                <TableCell className="w-32 align-top">
                  <Field>
                    <FieldLabel htmlFor={`item-vat-rate-${index}`} className="sr-only">
                      {t('items.vat_rate')}
                    </FieldLabel>
                    <Controller
                      control={control}
                      name={`items.${index}.vat_rate`}
                      render={({ field: vatField }) => (
                        <Select value={vatField.value} onValueChange={vatField.onChange}>
                          <SelectTrigger id={`item-vat-rate-${index}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(vatRates.data ?? []).map(
                              (rate) =>
                                rate.rate != null && (
                                  <SelectItem key={rate.id} value={String(rate.rate)}>
                                    {rate.label ?? `${rate.rate}%`}
                                  </SelectItem>
                                ),
                            )}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </Field>
                </TableCell>
                <TableCell className="align-top whitespace-nowrap">
                  {formatMoney(total, currency, i18n.language)}
                </TableCell>
                <TableCell className="align-top">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    disabled={fields.length <= 1}
                    aria-label={t('items.delete')}
                    onClick={() => remove(index)}
                  >
                    <TrashIcon />
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <Button
        type="button"
        variant="outline"
        className="self-start"
        onClick={() => append({ ...emptyItem(), vat_rate: defaultVatRate })}
      >
        <PlusIcon />
        {t('items.add')}
      </Button>
    </div>
  )
}
