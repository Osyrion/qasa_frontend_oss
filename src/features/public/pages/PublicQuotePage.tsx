import { isAxiosError } from 'axios'
import { DownloadIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { toast } from 'sonner'

import {
  useGetPublicQuotesToken,
  usePostPublicQuotesTokenAccept,
  usePostPublicQuotesTokenReject,
} from '@/api/generated/public-quote/public-quote'
import { DateText } from '@/shared/components/DateText'
import { MoneyText } from '@/shared/components/MoneyText'
import { queryClient } from '@/shared/lib/query-client'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Spinner } from '@/shared/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import { Textarea } from '@/shared/ui/textarea'

export function PublicQuotePage() {
  const { token } = useParams()
  const { t } = useTranslation('quotes')

  const quote = useGetPublicQuotesToken(token ?? '', { query: { enabled: Boolean(token) } })

  if (quote.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-8" />
      </div>
    )
  }

  if (quote.isError || !quote.data) {
    const isRateLimited = isAxiosError(quote.error) && quote.error.response?.status === 429
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-muted-foreground">
          {isRateLimited ? t('public.rate_limited') : t('public.not_found')}
        </p>
      </div>
    )
  }

  const data = quote.data
  const currency = data.currency ?? 'EUR'

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {data.quote_number ?? t('list.draft_placeholder')}
        </h1>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{t(`public.status.${data.effective_status}`)}</Badge>
          {token && (
            <Button asChild variant="outline" size="sm">
              <a
                href={`${import.meta.env.VITE_API_URL ?? 'http://localhost:8000'}/api/v1/public/quotes/${token}/pdf`}
                target="_blank"
                rel="noreferrer"
              >
                <DownloadIcon />
                {t('detail.pdf')}
              </a>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('public.supplier')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col text-sm">
            <span className="font-medium">{data.supplier?.name}</span>
            <span>{[data.supplier?.address, data.supplier?.city].filter(Boolean).join(', ')}</span>
            {data.supplier?.ico && <span>IČO: {data.supplier.ico}</span>}
            {data.supplier?.vat_id && (
              <span>
                {t('public.vat_id')}: {data.supplier.vat_id}
              </span>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('public.client')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col text-sm">
            <span className="font-medium">{data.client?.name}</span>
            <span>{[data.client?.address, data.client?.city].filter(Boolean).join(', ')}</span>
            {data.client?.ico && <span>IČO: {data.client.ico}</span>}
            {data.client?.vat_id && (
              <span>
                {t('public.vat_id')}: {data.client.vat_id}
              </span>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-muted-foreground">{t('form.issued_at')}</div>
            <DateText value={data.issued_at} variant="date-only" />
          </div>
          <div>
            <div className="text-muted-foreground">{t('form.valid_until')}</div>
            <DateText value={data.valid_until} variant="date-only" />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('items.description')}</TableHead>
                <TableHead>{t('items.quantity')}</TableHead>
                <TableHead>{t('items.unit_price')}</TableHead>
                <TableHead>{t('items.vat_rate')}</TableHead>
                <TableHead>{t('items.total_incl_vat')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data.items ?? []).map((item, index) => (
                <TableRow key={index}>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex flex-col items-end gap-1 text-sm">
            <span>
              {t('detail.subtotal')}: <MoneyText amount={data.subtotal} currency={currency} />
            </span>
            <span>
              {t('detail.vat')}: <MoneyText amount={data.vat_amount} currency={currency} />
            </span>
            <span className="text-base font-semibold">
              {t('detail.total')}: <MoneyText amount={data.total} currency={currency} />
            </span>
          </div>
        </CardContent>
      </Card>

      {token && <QuoteDecisionPanel token={token} canDecide={data.can_decide ?? false} />}
    </div>
  )
}

interface QuoteDecisionPanelProps {
  token: string
  canDecide: boolean
}

function QuoteDecisionPanel({ token, canDecide }: QuoteDecisionPanelProps) {
  const { t } = useTranslation('quotes')
  const [note, setNote] = useState('')
  const [decided, setDecided] = useState(false)

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [`/api/v1/public/quotes/${token}`] })

  const handleError = (error: unknown) => {
    if (isAxiosError(error) && error.response?.status === 429) {
      toast.error(t('public.rate_limited'))
      return
    }
    if (isAxiosError(error) && error.response?.status === 422) {
      const code = (error.response.data as { message?: string } | undefined)?.message ?? ''
      toast.error(
        code.includes('expired')
          ? t('public.decision.expired')
          : t('public.decision.already_decided'),
      )
      void invalidate()
      return
    }
    toast.error(t('public.decision.failed'))
  }

  const accept = usePostPublicQuotesTokenAccept({
    mutation: {
      onSuccess: () => {
        setDecided(true)
        toast.success(t('public.decision.accepted'))
        void invalidate()
      },
      onError: handleError,
    },
  })

  const reject = usePostPublicQuotesTokenReject({
    mutation: {
      onSuccess: () => {
        setDecided(true)
        toast.success(t('public.decision.rejected'))
        void invalidate()
      },
      onError: handleError,
    },
  })

  if (!canDecide || decided) return null

  const isPending = accept.isPending || reject.isPending

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-6">
        <label className="flex flex-col gap-1 text-sm">
          {t('public.decision.note_label')}
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={1000}
          />
        </label>
        <div className="flex gap-2">
          <Button
            disabled={isPending}
            onClick={() => {
              if (window.confirm(t('public.decision.confirm_accept'))) {
                accept.mutate({ token, data: { decision_note: note || null } })
              }
            }}
          >
            {t('public.decision.accept')}
          </Button>
          <Button
            variant="outline"
            className="text-destructive"
            disabled={isPending}
            onClick={() => {
              if (window.confirm(t('public.decision.confirm_reject'))) {
                reject.mutate({ token, data: { decision_note: note || null } })
              }
            }}
          >
            {t('public.decision.reject')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
