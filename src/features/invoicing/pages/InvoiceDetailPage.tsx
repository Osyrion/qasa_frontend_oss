import { FileTextIcon, MailIcon, PencilIcon, TrashIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'

import { useDeleteInvoicesId, useGetInvoicesId } from '@/api/generated/invoices/invoices'
import { EmailDialog } from '@/features/invoicing/components/EmailDialog'
import { InvoiceItemsEditor } from '@/features/invoicing/components/InvoiceItemsEditor'
import { PaymentsCard } from '@/features/invoicing/components/PaymentsCard'
import { PublicLinkCard } from '@/features/invoicing/components/PublicLinkCard'
import { StatusActions } from '@/features/invoicing/components/StatusActions'
import { isEditable } from '@/features/invoicing/lib/status-transitions'
import { DateText } from '@/shared/components/DateText'
import { MoneyText } from '@/shared/components/MoneyText'
import { queryClient } from '@/shared/lib/query-client'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'

export function InvoiceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation('invoices')
  const { t: tCommon } = useTranslation()
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)

  const invoice = useGetInvoicesId(id ?? '', { query: { enabled: Boolean(id) } })

  const deleteInvoice = useDeleteInvoicesId({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ['/api/v1/invoices'] })
        toast.success(t('detail.deleted'))
        void navigate('/invoices')
      },
    },
  })

  if (!id) {
    return <Navigate to="/invoices" replace />
  }

  if (invoice.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!invoice.data) {
    return <Navigate to="/invoices" replace />
  }

  const data = invoice.data
  const status = data.status ?? 'draft'
  const editable = isEditable(status)

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">
            {data.invoice_number ?? t('list.draft_placeholder')}
          </h1>
          <Badge variant="secondary">{t(`status.${status}`)}</Badge>
          {data.is_overdue && <Badge variant="destructive">{t('list.overdue')}</Badge>}
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to={`/invoices/${id}/pdf`}>
              <FileTextIcon />
              {t('detail.pdf')}
            </Link>
          </Button>
          <Button variant="outline" onClick={() => setEmailDialogOpen(true)}>
            <MailIcon />
            {t('detail.email')}
          </Button>
          {editable && (
            <Button asChild variant="outline">
              <Link to={`/invoices/${id}/edit`}>
                <PencilIcon />
                {tCommon('edit')}
              </Link>
            </Button>
          )}
          {editable && (
            <Button
              variant="outline"
              className="text-destructive"
              onClick={() => {
                if (window.confirm(tCommon('confirm_delete'))) {
                  deleteInvoice.mutate({ id })
                }
              }}
            >
              <TrashIcon />
              {tCommon('delete')}
            </Button>
          )}
        </div>
      </div>

      <StatusActions invoice={data} />

      <Card>
        <CardHeader>
          <CardTitle>{t('detail.overview')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <DetailRow label={t('form.client')}>{data.client?.display_name ?? '—'}</DetailRow>
          <DetailRow label={t('form.currency')}>{data.currency ?? '—'}</DetailRow>
          <DetailRow label={t('form.issued_at')}>
            <DateText value={data.issued_at} variant="date-only" />
          </DetailRow>
          <DetailRow label={t('form.due_at')}>
            <DateText value={data.due_at} variant="date-only" />
          </DetailRow>
          <DetailRow label={t('form.variable_symbol')}>{data.variable_symbol ?? '—'}</DetailRow>
          <DetailRow label={t('detail.total')}>
            <MoneyText amount={data.total} currency={data.currency ?? 'EUR'} />
          </DetailRow>
          {data.note_above && (
            <div className="col-span-2">
              <DetailRow label={t('form.note_above')}>{data.note_above}</DetailRow>
            </div>
          )}
          {data.note && (
            <div className="col-span-2">
              <DetailRow label={t('form.note')}>{data.note}</DetailRow>
            </div>
          )}
        </CardContent>
      </Card>

      <InvoiceItemsEditor
        invoiceId={id}
        items={data.items ?? []}
        currency={data.currency ?? 'EUR'}
        editable={editable}
      />

      <PaymentsCard invoice={data} />

      <PublicLinkCard invoice={data} />

      <EmailDialog invoiceId={id} open={emailDialogOpen} onOpenChange={setEmailDialogOpen} />
    </div>
  )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="text-muted-foreground">{label}</span>
      <span>{children}</span>
    </div>
  )
}
