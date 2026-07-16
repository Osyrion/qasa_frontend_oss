import { FileTextIcon, MailIcon, PencilIcon, TrashIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'

import { useDeleteQuotesId, useGetQuotesId } from '@/api/generated/quotes/quotes'
import { EmailDialog } from '@/features/quotes/components/EmailDialog'
import { PublicLinkCard } from '@/features/quotes/components/PublicLinkCard'
import { QuoteItemsEditor } from '@/features/quotes/components/QuoteItemsEditor'
import { QuoteStatusActions } from '@/features/quotes/components/QuoteStatusActions'
import { isQuoteEditable } from '@/shared/lib/transitions'
import { DateText } from '@/shared/components/DateText'
import { MoneyText } from '@/shared/components/MoneyText'
import { queryClient } from '@/shared/lib/query-client'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'

export function QuoteDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation('quotes')
  const { t: tCommon } = useTranslation()
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)

  const quote = useGetQuotesId(id ?? '', { query: { enabled: Boolean(id) } })

  const deleteQuote = useDeleteQuotesId({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ['/api/v1/quotes'] })
        toast.success(t('detail.deleted'))
        void navigate('/quotes')
      },
    },
  })

  if (!id) {
    return <Navigate to="/quotes" replace />
  }

  if (quote.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!quote.data) {
    return <Navigate to="/quotes" replace />
  }

  const data = quote.data
  const status = data.status ?? 'draft'
  const editable = isQuoteEditable(status)

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">
            {data.quote_number ?? t('list.draft_placeholder')}
          </h1>
          <Badge variant="secondary">{t(`status.${data.effective_status ?? status}`)}</Badge>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to={`/quotes/${id}/pdf`}>
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
              <Link to={`/quotes/${id}/edit`}>
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
                  deleteQuote.mutate({ id })
                }
              }}
            >
              <TrashIcon />
              {tCommon('delete')}
            </Button>
          )}
        </div>
      </div>

      <QuoteStatusActions quote={data} />

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
          <DetailRow label={t('form.valid_until')}>
            <DateText value={data.valid_until} variant="date-only" />
          </DetailRow>
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

      <QuoteItemsEditor
        quoteId={id}
        items={data.items ?? []}
        currency={data.currency ?? 'EUR'}
        editable={editable}
      />

      <PublicLinkCard quote={data} />

      <EmailDialog quoteId={id} open={emailDialogOpen} onOpenChange={setEmailDialogOpen} />
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
