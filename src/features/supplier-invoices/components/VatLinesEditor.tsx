import { PlusIcon, TrashIcon } from 'lucide-react'
import { useMemo } from 'react'
import {
  Controller,
  useFieldArray,
  useWatch,
  type Control,
  type FieldErrors,
} from 'react-hook-form'
import { useTranslation } from 'react-i18next'

import { useGetVatRates } from '@/api/generated/vat-rates/vat-rates'
import type { SupplierInvoiceFormValues } from '@/features/supplier-invoices/lib/form-values'
import { MoneyText } from '@/shared/components/MoneyText'
import { formatMoney, normalizeMoneyInput } from '@/shared/lib/money'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'

interface VatLinesEditorProps {
  control: Control<SupplierInvoiceFormValues>
  errors: FieldErrors<SupplierInvoiceFormValues>
  currency: string
  editable: boolean
}

function emptyLine(vatRate: string) {
  return { vat_rate: vatRate, base: '', vat_amount: '' }
}

export function VatLinesEditor({ control, errors, currency, editable }: VatLinesEditorProps) {
  const { t, i18n } = useTranslation('supplierInvoices')
  const vatRates = useGetVatRates()
  const defaultVatRate = useMemo(() => {
    const preferred = vatRates.data?.find((rate) => rate.is_default) ?? vatRates.data?.[0]
    return preferred?.rate != null ? String(preferred.rate) : '0'
  }, [vatRates.data])

  const { fields, append, remove } = useFieldArray({ control, name: 'vat_lines' })
  const watchedLines = useWatch({ control, name: 'vat_lines' })

  const subtotal = (watchedLines ?? []).reduce(
    (sum, line) => sum + (Number(normalizeMoneyInput(line?.base || '0')) || 0),
    0,
  )
  const vatAmount = (watchedLines ?? []).reduce(
    (sum, line) => sum + (Number(normalizeMoneyInput(line?.vat_amount || '0')) || 0),
    0,
  )

  return (
    <div className="flex flex-col gap-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('vat_lines.vat_rate')}</TableHead>
            <TableHead>{t('vat_lines.base')}</TableHead>
            <TableHead>{t('vat_lines.vat_amount')}</TableHead>
            {editable && <TableHead />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {fields.map((field, index) => (
            <TableRow key={field.id}>
              <TableCell className="w-40">
                <Controller
                  control={control}
                  name={`vat_lines.${index}.vat_rate`}
                  render={({ field: vatField }) =>
                    editable ? (
                      <Select value={vatField.value} onValueChange={vatField.onChange}>
                        <SelectTrigger aria-label={t('vat_lines.vat_rate')}>
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
                    ) : (
                      <span>{vatField.value}%</span>
                    )
                  }
                />
              </TableCell>
              <TableCell className="w-40">
                {editable ? (
                  <Controller
                    control={control}
                    name={`vat_lines.${index}.base`}
                    render={({ field: baseField }) => (
                      <Input aria-label={t('vat_lines.base')} {...baseField} />
                    )}
                  />
                ) : (
                  <MoneyText amount={Number(watchedLines?.[index]?.base)} currency={currency} />
                )}
                {errors.vat_lines?.[index]?.base && (
                  <p className="text-sm text-destructive">
                    {errors.vat_lines[index]?.base?.message}
                  </p>
                )}
              </TableCell>
              <TableCell className="w-40">
                {editable ? (
                  <Controller
                    control={control}
                    name={`vat_lines.${index}.vat_amount`}
                    render={({ field: vatAmountField }) => (
                      <Input aria-label={t('vat_lines.vat_amount')} {...vatAmountField} />
                    )}
                  />
                ) : (
                  <MoneyText
                    amount={Number(watchedLines?.[index]?.vat_amount)}
                    currency={currency}
                  />
                )}
                {errors.vat_lines?.[index]?.vat_amount && (
                  <p className="text-sm text-destructive">
                    {errors.vat_lines[index]?.vat_amount?.message}
                  </p>
                )}
              </TableCell>
              {editable && (
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    aria-label={t('vat_lines.delete')}
                    disabled={fields.length <= 1}
                    onClick={() => remove(index)}
                  >
                    <TrashIcon />
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell className="font-medium">{t('vat_lines.subtotal')}</TableCell>
            <TableCell>{formatMoney(subtotal, currency, i18n.language)}</TableCell>
            <TableCell>{formatMoney(vatAmount, currency, i18n.language)}</TableCell>
            {editable && <TableCell />}
          </TableRow>
        </TableFooter>
      </Table>

      {editable && (
        <Button
          type="button"
          variant="outline"
          className="self-start"
          onClick={() => append(emptyLine(defaultVatRate))}
        >
          <PlusIcon />
          {t('vat_lines.add')}
        </Button>
      )}
    </div>
  )
}
