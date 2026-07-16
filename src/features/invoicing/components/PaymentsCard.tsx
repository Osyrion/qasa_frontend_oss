import { PlusIcon, TrashIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  useDeleteInvoicesInvoicePaymentsPayment,
  useGetInvoicesInvoicePayments,
} from '@/api/generated/invoices/invoices'
import type { Invoice } from '@/api/generated/qASAAPIDocumentation.schemas'
import { AddPaymentDialog } from '@/features/invoicing/components/AddPaymentDialog'
import { canRecordPayment } from '@/features/invoicing/lib/status-transitions'
import { DateText } from '@/shared/components/DateText'
import { MoneyText } from '@/shared/components/MoneyText'
import { queryClient } from '@/shared/lib/query-client'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'

interface PaymentsCardProps {
  invoice: Invoice
}

export function PaymentsCard({ invoice }: PaymentsCardProps) {
  const { t } = useTranslation('invoices')
  const { t: tCommon } = useTranslation()
  const [dialogOpen, setDialogOpen] = useState(false)

  const payments = useGetInvoicesInvoicePayments(invoice.id ?? '', {
    query: { enabled: Boolean(invoice.id) },
  })

  const deletePayment = useDeleteInvoicesInvoicePaymentsPayment({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: [`/api/v1/invoices/${invoice.id}`] })
        void queryClient.invalidateQueries({
          queryKey: [`/api/v1/invoices/${invoice.id}/payments`],
        })
        toast.success(t('payments.deleted'))
      },
    },
  })

  const canAdd = invoice.id != null && canRecordPayment(invoice.status ?? 'draft')

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t('payments.title')}</CardTitle>
        {canAdd && (
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <PlusIcon />
            {tCommon('add')}
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{t('payments.balance')}:</span>
          <MoneyText amount={invoice.balance} currency={invoice.currency ?? 'EUR'} />
          <Badge variant="secondary">{t(`payments.status_${invoice.payment_status}`)}</Badge>
        </div>

        {payments.isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : !payments.data?.length ? (
          <p className="text-sm text-muted-foreground">{t('payments.empty')}</p>
        ) : (
          payments.data.map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex flex-col">
                <span className="font-medium">
                  <MoneyText amount={payment.amount} currency={invoice.currency ?? 'EUR'} />
                </span>
                <span className="text-sm text-muted-foreground">
                  <DateText value={payment.paid_at} variant="date-only" />
                  {payment.method && ` · ${t(`payments.method_${payment.method}`)}`}
                  {payment.note && ` · ${payment.note}`}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                aria-label={tCommon('delete')}
                onClick={() => {
                  if (payment.id && window.confirm(tCommon('confirm_delete'))) {
                    deletePayment.mutate({ invoice: invoice.id!, payment: payment.id })
                  }
                }}
              >
                <TrashIcon />
              </Button>
            </div>
          ))
        )}
      </CardContent>

      {invoice.id && (
        <AddPaymentDialog
          invoiceId={invoice.id}
          suggestedAmount={invoice.balance ?? 0}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </Card>
  )
}
