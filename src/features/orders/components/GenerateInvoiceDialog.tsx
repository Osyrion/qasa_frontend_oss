import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'

import { usePostInvoicesGenerateFromOrder } from '@/api/generated/invoices/invoices'
import {
  PostInvoicesGenerateFromOrderBodyCurrency,
  type Order,
} from '@/api/generated/qASAAPIDocumentation.schemas'
import { TextField } from '@/shared/components/TextField'
import { applyLaravelErrors } from '@/shared/lib/laravel-errors'
import { queryClient } from '@/shared/lib/query-client'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Field, FieldLabel } from '@/shared/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Textarea } from '@/shared/ui/textarea'

const CURRENCIES = Object.values(PostInvoicesGenerateFromOrderBodyCurrency)

interface FormValues {
  issued_at: string
  due_at: string
  currency: PostInvoicesGenerateFromOrderBodyCurrency
  note: string
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

interface GenerateInvoiceDialogProps {
  order: Order
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GenerateInvoiceDialog({ order, open, onOpenChange }: GenerateInvoiceDialogProps) {
  const { t } = useTranslation('orders')
  const { t: tCommon } = useTranslation()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(
      z.object({
        issued_at: z.string().min(1),
        due_at: z.string().min(1),
        currency: z.enum(CURRENCIES),
        note: z.string().max(2000),
      }),
    ),
    defaultValues: {
      issued_at: todayIso(),
      due_at: todayIso(),
      currency: (order.currency ?? 'EUR') as PostInvoicesGenerateFromOrderBodyCurrency,
      note: '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        issued_at: todayIso(),
        due_at: todayIso(),
        currency: (order.currency ?? 'EUR') as PostInvoicesGenerateFromOrderBodyCurrency,
        note: '',
      })
    }
  }, [open, order.currency, reset])

  const generate = usePostInvoicesGenerateFromOrder({
    mutation: {
      onSuccess: (invoice) => {
        void queryClient.invalidateQueries({ queryKey: ['/api/v1/invoices'] })
        toast.success(t('generate_invoice.created'))
        onOpenChange(false)
        void navigate(`/invoices/${invoice.id}`)
      },
      onError: (error) => {
        const message = applyLaravelErrors(error, setError)
        if (message) toast.error(message)
      },
    },
  })

  const onSubmit: SubmitHandler<FormValues> = (values) => {
    if (!order.id) return
    generate.mutate({
      data: {
        order_id: order.id,
        issued_at: values.issued_at,
        due_at: values.due_at,
        currency: values.currency,
        note: values.note || null,
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogHeader>
            <DialogTitle>{t('generate_invoice.title')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <TextField
                id="gen-issued-at"
                type="date"
                label={t('generate_invoice.issued_at')}
                error={errors.issued_at}
                {...register('issued_at')}
              />
              <TextField
                id="gen-due-at"
                type="date"
                label={t('generate_invoice.due_at')}
                error={errors.due_at}
                {...register('due_at')}
              />
            </div>
            <Field>
              <FieldLabel htmlFor="gen-currency">{t('generate_invoice.currency')}</FieldLabel>
              <Select
                value={watch('currency')}
                onValueChange={(value) =>
                  setValue('currency', value as PostInvoicesGenerateFromOrderBodyCurrency)
                }
              >
                <SelectTrigger id="gen-currency">
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
              <FieldLabel htmlFor="gen-note">{t('generate_invoice.note')}</FieldLabel>
              <Textarea id="gen-note" {...register('note')} />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon('cancel')}
            </Button>
            <Button type="submit" disabled={generate.isPending}>
              {t('generate_invoice.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
