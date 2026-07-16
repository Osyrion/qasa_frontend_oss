import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { usePostInvoicesInvoicePayments } from '@/api/generated/invoices/invoices'
import { PostInvoicesInvoicePaymentsBodyMethod } from '@/api/generated/qASAAPIDocumentation.schemas'
import { TextField } from '@/shared/components/TextField'
import { applyLaravelErrors } from '@/shared/lib/laravel-errors'
import { useIdempotencyKey } from '@/shared/lib/idempotency'
import { normalizeMoneyInput } from '@/shared/lib/money'
import { queryClient } from '@/shared/lib/query-client'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/shared/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Textarea } from '@/shared/ui/textarea'

const METHODS = Object.values(PostInvoicesInvoicePaymentsBodyMethod)

interface PaymentFormValues {
  amount: string
  paid_at: string
  method: Exclude<PostInvoicesInvoicePaymentsBodyMethod, null> | ''
  note: string
}

function defaultValues(suggestedAmount: string): PaymentFormValues {
  return {
    amount: suggestedAmount,
    paid_at: new Date().toISOString().slice(0, 10),
    method: '',
    note: '',
  }
}

interface AddPaymentDialogProps {
  invoiceId: string
  suggestedAmount: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddPaymentDialog({
  invoiceId,
  suggestedAmount,
  open,
  onOpenChange,
}: AddPaymentDialogProps) {
  const { t } = useTranslation('invoices')
  const { t: tCommon } = useTranslation()
  const idempotency = useIdempotencyKey()

  const schema = z.object({
    amount: z.string().refine((value) => Number(normalizeMoneyInput(value)) > 0, {
      message: t('validation.amount_positive'),
    }),
    paid_at: z.string().min(1),
    method: z.enum([...METHODS, '']),
    note: z.string().max(255),
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(suggestedAmount > 0 ? String(suggestedAmount) : ''),
  })

  useEffect(() => {
    if (open) {
      reset(defaultValues(suggestedAmount > 0 ? String(suggestedAmount) : ''))
    }
  }, [open, suggestedAmount, reset])

  const addPayment = usePostInvoicesInvoicePayments({
    request: { headers: { 'Idempotency-Key': idempotency.get() } },
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: [`/api/v1/invoices/${invoiceId}`] })
        void queryClient.invalidateQueries({
          queryKey: [`/api/v1/invoices/${invoiceId}/payments`],
        })
        idempotency.reset()
        toast.success(t('payments.created'))
        onOpenChange(false)
      },
      onError: (error) => {
        const message = applyLaravelErrors(error, setError)
        if (message) toast.error(message)
      },
    },
  })

  const onSubmit: SubmitHandler<PaymentFormValues> = (values) => {
    addPayment.mutate({
      invoice: invoiceId,
      data: {
        amount: Number(normalizeMoneyInput(values.amount)),
        paid_at: values.paid_at,
        method: values.method || null,
        note: values.note || null,
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogHeader>
            <DialogTitle>{t('payments.add_title')}</DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <div className="grid grid-cols-2 gap-3">
              <TextField
                id="payment-amount"
                label={t('payments.amount')}
                error={errors.amount}
                {...register('amount')}
              />
              <TextField
                id="payment-paid-at"
                type="date"
                label={t('payments.paid_at')}
                error={errors.paid_at}
                {...register('paid_at')}
              />
            </div>
            <Field>
              <FieldLabel htmlFor="payment-method">{t('payments.method')}</FieldLabel>
              <Select
                value={watch('method') || 'none'}
                onValueChange={(value) =>
                  setValue(
                    'method',
                    value === 'none'
                      ? ''
                      : (value as Exclude<PostInvoicesInvoicePaymentsBodyMethod, null>),
                  )
                }
              >
                <SelectTrigger id="payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('payments.method_none')}</SelectItem>
                  {METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {t(`payments.method_${method}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="payment-note">{t('payments.note')}</FieldLabel>
              <Textarea id="payment-note" {...register('note')} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon('cancel')}
            </Button>
            <Button type="submit" disabled={addPayment.isPending}>
              {tCommon('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
