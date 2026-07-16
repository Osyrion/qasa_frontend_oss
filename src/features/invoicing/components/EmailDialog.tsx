import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { useEffect } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import { usePostInvoicesInvoiceEmail } from '@/api/generated/invoices/invoices'
import { TextField } from '@/shared/components/TextField'
import { extractErrorMessage } from '@/shared/lib/laravel-errors'
import { useIdempotencyKey } from '@/shared/lib/idempotency'
import { queryClient } from '@/shared/lib/query-client'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Field, FieldLabel } from '@/shared/ui/field'
import { Textarea } from '@/shared/ui/textarea'

interface EmailFormValues {
  to: string
  cc: string
  message: string
}

const emailListSchema = z.string().refine(
  (value) => {
    const emails = splitEmails(value)
    return emails.length <= 5 && emails.every((email) => z.email().safeParse(email).success)
  },
  { message: 'invalid' },
)

function splitEmails(value: string): string[] {
  return value
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean)
}

interface EmailDialogProps {
  invoiceId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EmailDialog({ invoiceId, open, onOpenChange }: EmailDialogProps) {
  const { t } = useTranslation('invoices')
  const { t: tCommon } = useTranslation()
  const idempotency = useIdempotencyKey()

  const schema = z.object({
    to: z.string().refine((value) => !value || z.email().safeParse(value).success, {
      message: t('validation.email'),
    }),
    cc: emailListSchema.refine((value) => splitEmails(value).length <= 5, {
      message: t('email.cc_max'),
    }),
    message: z.string().max(2000),
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EmailFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { to: '', cc: '', message: '' },
  })

  useEffect(() => {
    if (open) reset({ to: '', cc: '', message: '' })
  }, [open, reset])

  const sendEmail = usePostInvoicesInvoiceEmail({
    request: { headers: { 'Idempotency-Key': idempotency.get() } },
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: [`/api/v1/invoices/${invoiceId}`] })
        void queryClient.invalidateQueries({ queryKey: ['/api/v1/invoices'] })
        idempotency.reset()
        toast.success(t('email.sent'))
        onOpenChange(false)
      },
      onError: (error) => {
        if (isAxiosError(error) && error.response?.status === 429) {
          toast.error(t('email.throttled'))
          return
        }
        toast.error(extractErrorMessage(error) ?? t('email.failed'))
      },
    },
  })

  const onSubmit: SubmitHandler<EmailFormValues> = (values) => {
    sendEmail.mutate({
      invoice: invoiceId,
      data: {
        to: values.to || null,
        cc: splitEmails(values.cc).length ? splitEmails(values.cc) : null,
        message: values.message || null,
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogHeader>
            <DialogTitle>{t('email.title')}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <TextField
              id="email-to"
              type="email"
              label={t('email.to')}
              error={errors.to}
              {...register('to')}
            />
            <TextField
              id="email-cc"
              label={t('email.cc')}
              error={errors.cc}
              placeholder={t('email.cc_placeholder')}
              {...register('cc')}
            />
            <Field>
              <FieldLabel htmlFor="email-message">{t('email.message')}</FieldLabel>
              <Textarea id="email-message" {...register('message')} />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon('cancel')}
            </Button>
            <Button type="submit" disabled={sendEmail.isPending}>
              {t('email.send')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
