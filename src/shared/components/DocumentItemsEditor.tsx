import { zodResolver } from '@hookform/resolvers/zod'
import { PencilIcon, PlusIcon, TrashIcon, XIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { useGetVatRates } from '@/api/generated/vat-rates/vat-rates'
import { TextField } from '@/shared/components/TextField'
import { MoneyText } from '@/shared/components/MoneyText'
import { applyLaravelErrors } from '@/shared/lib/laravel-errors'
import { formatMoney, normalizeMoneyInput } from '@/shared/lib/money'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/shared/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

export interface DocumentItemLike {
  id?: string
  type?: string
  description?: string
  quantity?: number
  unit?: string
  unit_price?: number
  vat_rate?: number
  total_incl_vat?: number
}

export interface DocumentItemAddValues {
  type?: string
  description: string
  quantity: number
  unit?: string
  unit_price: number
  vat_rate: number
}

interface ItemFormValues {
  type: string
  description: string
  quantity: string
  unit: string
  unit_price: string
  vat_rate: string
}

interface TypeOption {
  value: string
  label: string
}

function defaultItemValues(defaultVatRate: string, defaultType: string): ItemFormValues {
  return {
    type: defaultType,
    description: '',
    quantity: '1',
    unit: 'ks',
    unit_price: '',
    vat_rate: defaultVatRate,
  }
}

function itemToFormValues(item: DocumentItemLike): ItemFormValues {
  return {
    type: item.type ?? '',
    description: item.description ?? '',
    quantity: item.quantity != null ? String(item.quantity) : '1',
    unit: item.unit ?? 'ks',
    unit_price: item.unit_price != null ? String(item.unit_price) : '',
    vat_rate: item.vat_rate != null ? String(item.vat_rate) : '0',
  }
}

interface DocumentItemsEditorProps<TItem extends DocumentItemLike> {
  items: TItem[]
  currency: string
  editable: boolean
  /** i18n namespace carrying `items.*` and `validation.*` keys (same shape as invoices.json). */
  namespace: string
  onAdd: (values: DocumentItemAddValues) => Promise<void>
  onDelete: (item: TItem) => void
  isAdding?: boolean
  isDeleting?: boolean
  /** When set, enables the type select and full CRUD (edit-in-place) mode — used by orders. */
  typeOptions?: TypeOption[]
  onUpdate?: (item: TItem, values: DocumentItemAddValues) => Promise<void>
  isUpdating?: boolean
}

export function DocumentItemsEditor<TItem extends DocumentItemLike>({
  items,
  currency,
  editable,
  namespace,
  onAdd,
  onDelete,
  isAdding = false,
  isDeleting = false,
  typeOptions,
  onUpdate,
  isUpdating = false,
}: DocumentItemsEditorProps<TItem>) {
  const { t, i18n } = useTranslation(namespace)
  const vatRates = useGetVatRates()
  const defaultVatRate = useMemo(() => {
    const preferred = vatRates.data?.find((rate) => rate.is_default) ?? vatRates.data?.[0]
    return preferred?.rate != null ? String(preferred.rate) : '0'
  }, [vatRates.data])
  const defaultType = typeOptions?.[0]?.value ?? ''

  const [editingItem, setEditingItem] = useState<TItem | null>(null)

  const schema = z.object({
    type: z.string(),
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
    defaultValues: defaultItemValues(defaultVatRate, defaultType),
  })

  // VAT rates load asynchronously, after the form's defaultValues are captured —
  // sync the field once they arrive, unless the user already picked a rate.
  useEffect(() => {
    if (vatRates.data?.length && !dirtyFields.vat_rate && !editingItem) {
      setValue('vat_rate', defaultVatRate)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultVatRate, vatRates.data])

  const startEditing = (item: TItem) => {
    setEditingItem(item)
    reset(itemToFormValues(item))
  }

  const cancelEditing = () => {
    setEditingItem(null)
    reset(defaultItemValues(defaultVatRate, defaultType))
  }

  const onSubmit: SubmitHandler<ItemFormValues> = async (values) => {
    const payload: DocumentItemAddValues = {
      type: typeOptions ? values.type : undefined,
      description: values.description,
      quantity: Number(normalizeMoneyInput(values.quantity)),
      unit: values.unit || undefined,
      unit_price: Number(normalizeMoneyInput(values.unit_price)),
      vat_rate: Number(values.vat_rate),
    }
    try {
      if (editingItem && onUpdate) {
        await onUpdate(editingItem, payload)
        setEditingItem(null)
      } else {
        await onAdd(payload)
      }
      reset(defaultItemValues(defaultVatRate, defaultType))
    } catch (error) {
      const message = applyLaravelErrors(error, setError)
      if (message) toast.error(message)
    }
  }

  const quantity = Number(normalizeMoneyInput(watch('quantity') || '0')) || 0
  const unitPrice = Number(normalizeMoneyInput(watch('unit_price') || '0')) || 0
  const vatRate = Number(watch('vat_rate') || '0') || 0
  const previewExclVat = quantity * unitPrice
  const previewTotal = previewExclVat * (1 + vatRate / 100)
  const isSaving = editingItem ? isUpdating : isAdding
  const extraColumn = editable ? 1 : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('detail.items')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Table>
          <TableHeader>
            <TableRow>
              {typeOptions && <TableHead>{t('items.type')}</TableHead>}
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
                <TableCell
                  colSpan={5 + (typeOptions ? 1 : 0) + extraColumn}
                  className="text-center text-muted-foreground"
                >
                  {t('items.empty')}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow
                  key={item.id}
                  className={editingItem?.id === item.id ? 'bg-muted/50' : undefined}
                >
                  {typeOptions && (
                    <TableCell>
                      {typeOptions.find((option) => option.value === item.type)?.label ?? item.type}
                    </TableCell>
                  )}
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
                    <TableCell className="flex justify-end gap-1">
                      {onUpdate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={t('items.edit')}
                          disabled={isSaving}
                          onClick={() => startEditing(item)}
                        >
                          <PencilIcon />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        aria-label={t('items.delete')}
                        disabled={isDeleting}
                        onClick={() => onDelete(item)}
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
              {typeOptions && (
                <Field>
                  <FieldLabel htmlFor="item-type">{t('items.type')}</FieldLabel>
                  <Select value={watch('type')} onValueChange={(value) => setValue('type', value)}>
                    <SelectTrigger id="item-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {typeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
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
                <div className="flex gap-2">
                  {editingItem && (
                    <Button type="button" variant="outline" onClick={cancelEditing}>
                      <XIcon />
                      {t('items.cancel_edit')}
                    </Button>
                  )}
                  <Button type="submit" disabled={isSaving}>
                    {editingItem ? <PencilIcon /> : <PlusIcon />}
                    {editingItem ? t('items.save') : t('items.add')}
                  </Button>
                </div>
              </div>
            </FieldGroup>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
