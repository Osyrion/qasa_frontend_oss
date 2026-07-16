import { zodResolver } from '@hookform/resolvers/zod'
import { PlusIcon, TrashIcon } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import {
  useDeleteInvoicesInvoiceItemsItem,
  usePostInvoicesInvoiceItems,
} from '@/api/generated/invoices/invoices'
import { useGetVatRates } from '@/api/generated/vat-rates/vat-rates'
import type { InvoiceItem } from '@/api/generated/qASAAPIDocumentation.schemas'
import { TextField } from '@/shared/components/TextField'
import { MoneyText } from '@/shared/components/MoneyText'
import { applyLaravelErrors } from '@/shared/lib/laravel-errors'
import { formatMoney, normalizeMoneyInput } from '@/shared/lib/money'
import { queryClient } from '@/shared/lib/query-client'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/shared/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

interface ItemFormValues {
  description: string
  quantity: string
  unit: string
  unit_price: string
  vat_rate: string
}

function defaultItemValues(defaultVatRate: string): ItemFormValues {
  return { description: '', quantity: '1', unit: 'ks', unit_price: '', vat_rate: defaultVatRate }
}

interface InvoiceItemsEditorProps {
  invoiceId: string
  items: InvoiceItem[]
  currency: string
  editable: boolean
}

export function InvoiceItemsEditor({
  invoiceId,
  items,
  currency,
  editable,
}: InvoiceItemsEditorProps) {
  const { t, i18n } = useTranslation('invoices')
  const vatRates = useGetVatRates()
  const defaultVatRate = useMemo(() => {
    const preferred = vatRates.data?.find((rate) => rate.is_default) ?? vatRates.data?.[0]
    return preferred?.rate != null ? String(preferred.rate) : '0'
  }, [vatRates.data])

  const schema = z.object({
    description: z.string().min(1, t('validation.description_required')).max(500),
    quantity: z.string().refine((value) => Number(normalizeMoneyInput(value)) > 0, {
      message: t('validation.quantity_positive'),
    }),
    unit: z.string().max(20),
    unit_price: z.string().refine((value) => Number(normalizeMoneyInput(value)) >= 0, {
      message: t('validation.unit_price_non_negative'),
    }),
    vat_rate: z.string(),
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    formState: { errors, dirtyFields },
  } = useForm<ItemFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultItemValues(defaultVatRate),
  })

  // VAT rates load asynchronously, after the form's defaultValues are captured —
  // sync the field once they arrive, unless the user already picked a rate.
  useEffect(() => {
    if (vatRates.data?.length && !dirtyFields.vat_rate) {
      setValue('vat_rate', defaultVatRate)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultVatRate, vatRates.data])

  const addItem = usePostInvoicesInvoiceItems({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: [`/api/v1/invoices/${invoiceId}`] })
        reset(defaultItemValues(defaultVatRate))
      },
      onError: (error) => {
        const message = applyLaravelErrors(error, setError)
        if (message) toast.error(message)
      },
    },
  })

  const deleteItem = useDeleteInvoicesInvoiceItemsItem({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: [`/api/v1/invoices/${invoiceId}`] })
      },
    },
  })

  const onSubmit: SubmitHandler<ItemFormValues> = (values) => {
    addItem.mutate({
      invoice: invoiceId,
      data: {
        description: values.description,
        quantity: Number(normalizeMoneyInput(values.quantity)),
        unit: values.unit || undefined,
        unit_price: Number(normalizeMoneyInput(values.unit_price)),
        vat_rate: Number(values.vat_rate),
      },
    })
  }

  const quantity = Number(normalizeMoneyInput(watch('quantity') || '0')) || 0
  const unitPrice = Number(normalizeMoneyInput(watch('unit_price') || '0')) || 0
  const vatRate = Number(watch('vat_rate') || '0') || 0
  const previewExclVat = quantity * unitPrice
  const previewTotal = previewExclVat * (1 + vatRate / 100)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('detail.items')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('items.description')}</TableHead>
              <TableHead>{t('items.quantity')}</TableHead>
              <TableHead>{t('items.unit_price')}</TableHead>
              <TableHead>{t('items.vat_rate')}</TableHead>
              <TableHead>{t('items.total_incl_vat')}</TableHead>
              {editable && <TableHead />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={editable ? 6 : 5} className="text-center text-muted-foreground">
                  {t('items.empty')}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>
                    {item.quantity} {item.unit}
                  </TableCell>
                  <TableCell>
                    <MoneyText amount={item.unit_price} currency={currency} />
                  </TableCell>
                  <TableCell>{item.vat_rate}%</TableCell>
                  <TableCell>
                    <MoneyText amount={item.total_incl_vat} currency={currency} />
                  </TableCell>
                  {editable && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        aria-label={t('items.delete')}
                        disabled={deleteItem.isPending}
                        onClick={() => {
                          if (item.id) {
                            deleteItem.mutate({ invoice: invoiceId, item: item.id })
                          }
                        }}
                      >
                        <TrashIcon />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {editable && (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="rounded-lg border p-4">
            <FieldGroup>
              <TextField
                id="item-description"
                label={t('items.description')}
                error={errors.description}
                {...register('description')}
              />
              <div className="grid grid-cols-4 gap-3">
                <TextField
                  id="item-quantity"
                  label={t('items.quantity')}
                  error={errors.quantity}
                  {...register('quantity')}
                />
                <TextField
                  id="item-unit"
                  label={t('items.unit')}
                  error={errors.unit}
                  {...register('unit')}
                />
                <TextField
                  id="item-unit-price"
                  label={t('items.unit_price')}
                  error={errors.unit_price}
                  {...register('unit_price')}
                />
                <Field>
                  <FieldLabel htmlFor="item-vat-rate">{t('items.vat_rate')}</FieldLabel>
                  <Select
                    value={watch('vat_rate')}
                    onValueChange={(value) => setValue('vat_rate', value)}
                  >
                    <SelectTrigger id="item-vat-rate">
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
                </Field>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t('items.preview_total', {
                    total: formatMoney(previewTotal, currency, i18n.language),
                  })}
                </span>
                <Button type="submit" disabled={addItem.isPending}>
                  <PlusIcon />
                  {t('items.add')}
                </Button>
              </div>
            </FieldGroup>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
