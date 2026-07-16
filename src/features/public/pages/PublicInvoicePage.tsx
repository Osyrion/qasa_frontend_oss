import { DownloadIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'

import { useGetPublicInvoicesToken } from '@/api/generated/public-invoice/public-invoice'
import { DateText } from '@/shared/components/DateText'
import { MoneyText } from '@/shared/components/MoneyText'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Spinner } from '@/shared/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

export function PublicInvoicePage() {
  const { token } = useParams()
  const { t } = useTranslation('invoices')

  const invoice = useGetPublicInvoicesToken(token ?? '', { query: { enabled: Boolean(token) } })

  if (invoice.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-8" />
      </div>
    )
  }

  if (invoice.isError || !invoice.data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-muted-foreground">{t('public.not_found')}</p>
      </div>
    )
  }

  const data = invoice.data
  const currency = data.currency ?? 'EUR'

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {data.invoice_number ?? t('list.draft_placeholder')}
        </h1>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{t(`public.status.${data.public_status}`)}</Badge>
          {token && (
            <Button asChild variant="outline" size="sm">
              <a
                href={`${import.meta.env.VITE_API_URL ?? 'http://localhost:8000'}/api/v1/public/invoices/${token}/pdf`}
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
        <CardHeader className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-muted-foreground">{t('form.issued_at')}</div>
            <DateText value={data.issued_at} variant="date-only" />
          </div>
          <div>
            <div className="text-muted-foreground">{t('form.due_at')}</div>
            <DateText value={data.due_at} variant="date-only" />
          </div>
          <div>
            <div className="text-muted-foreground">{t('form.variable_symbol')}</div>
            {data.variable_symbol ?? '—'}
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

      {data.payment?.qr_svg && !data.payment.is_paid && (
        <Card>
          <CardHeader>
            <CardTitle>{t('public.pay_by_qr')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-2">
            <img src={data.payment.qr_svg} alt={t('public.pay_by_qr')} className="size-48" />
            <MoneyText amount={data.payment.balance} currency={currency} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
