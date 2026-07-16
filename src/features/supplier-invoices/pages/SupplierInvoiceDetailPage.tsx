import { DownloadIcon, PencilIcon, TrashIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'

import { apiClient } from '@/api/mutator'
import {
  useDeleteSupplierInvoicesId,
  useGetSupplierInvoicesId,
} from '@/api/generated/supplier-invoices/supplier-invoices'
import type { SupplierInvoiceVatLine } from '@/api/generated/qASAAPIDocumentation.schemas'
import { PaymentQrCard } from '@/features/supplier-invoices/components/PaymentQrCard'
import { SupplierInvoiceStatusActions } from '@/features/supplier-invoices/components/SupplierInvoiceStatusActions'
import { VerifyAccountCard } from '@/features/supplier-invoices/components/VerifyAccountCard'
import { isSupplierInvoiceEditable } from '@/shared/lib/transitions'
import { DateText } from '@/shared/components/DateText'
import { MoneyText } from '@/shared/components/MoneyText'
import { triggerBlobDownload } from '@/shared/lib/download'
import { queryClient } from '@/shared/lib/query-client'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'

export function SupplierInvoiceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation('supplierInvoices')
  const { t: tCommon } = useTranslation()
  const [downloading, setDownloading] = useState(false)

  const supplierInvoice = useGetSupplierInvoicesId(id ?? '', { query: { enabled: Boolean(id) } })

  const deleteMutation = useDeleteSupplierInvoicesId({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ['/api/v1/supplier-invoices'] })
        toast.success(t('detail.deleted'))
        void navigate('/supplier-invoices')
      },
    },
  })

  if (!id) {
    return <Navigate to="/supplier-invoices" replace />
  }

  if (supplierInvoice.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!supplierInvoice.data) {
    return <Navigate to="/supplier-invoices" replace />
  }

  const data = supplierInvoice.data
  const status = data.status ?? 'draft'
  const editable = isSupplierInvoiceEditable(status)
  const currency = data.currency ?? 'EUR'
  const isSelfAssessed = data.vat_regime === 'eu_reverse_charge' || data.vat_regime === 'import'

  const handleDownload = async () => {
    if (!data.inbox_download_url) return
    setDownloading(true)
    try {
      const response = await apiClient.get<Blob>(data.inbox_download_url, { responseType: 'blob' })
      triggerBlobDownload(response.data, `${data.internal_number ?? 'attachment'}`)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">{data.internal_number}</h1>
          <Badge variant="secondary">{t(`status.${status}`)}</Badge>
        </div>
        <div className="flex gap-2">
          {editable && (
            <Button asChild variant="outline">
              <Link to={`/supplier-invoices/${id}/edit`}>
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
                  deleteMutation.mutate({ id })
                }
              }}
            >
              <TrashIcon />
              {tCommon('delete')}
            </Button>
          )}
        </div>
      </div>

      <SupplierInvoiceStatusActions supplierInvoice={data} />

      <Card>
        <CardHeader>
          <CardTitle>{t('detail.overview')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <DetailRow label={t('form.vendor')}>{data.client?.display_name ?? '—'}</DetailRow>
          <DetailRow label={t('form.supplier_invoice_number')}>
            {data.supplier_invoice_number}
          </DetailRow>
          <DetailRow label={t('form.issued_at')}>
            <DateText value={data.issued_at} variant="date-only" />
          </DetailRow>
          <DetailRow label={t('form.due_at')}>
            <DateText value={data.due_at} variant="date-only" />
          </DetailRow>
          <DetailRow label={t('form.vat_regime')}>{t(`vat_regime.${data.vat_regime}`)}</DetailRow>
          <DetailRow label={t('detail.total')}>
            <MoneyText amount={data.total} currency={currency} />
          </DetailRow>
          {isSelfAssessed && (
            <DetailRow label={t('detail.self_assessed_vat')}>
              <MoneyText amount={data.self_assessed_vat_amount} currency={currency} />
            </DetailRow>
          )}
          {data.note && (
            <div className="col-span-2">
              <DetailRow label={t('form.note')}>{data.note}</DetailRow>
            </div>
          )}
          {data.has_attachment && data.inbox_download_url && (
            <div className="col-span-2">
              <Button
                variant="outline"
                size="sm"
                disabled={downloading}
                onClick={() => void handleDownload()}
              >
                <DownloadIcon />
                {t('detail.download_attachment')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('form.section_vat')}</CardTitle>
        </CardHeader>
        <CardContent>
          <VatLinesEditorReadOnly currency={currency} lines={data.vat_lines ?? []} />
        </CardContent>
      </Card>

      <VerifyAccountCard supplierInvoice={data} />

      {(data.vendor_iban || (data.vendor_account_number && data.vendor_bank_code)) && (
        <PaymentQrCard supplierInvoiceId={id} />
      )}
    </div>
  )
}

function VatLinesEditorReadOnly({
  currency,
  lines,
}: {
  currency: string
  lines: SupplierInvoiceVatLine[]
}) {
  const { t } = useTranslation('supplierInvoices')
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-muted-foreground">
          <th className="py-1">{t('vat_lines.vat_rate')}</th>
          <th className="py-1">{t('vat_lines.base')}</th>
          <th className="py-1">{t('vat_lines.vat_amount')}</th>
        </tr>
      </thead>
      <tbody>
        {(lines ?? []).map((line) => (
          <tr key={line.id}>
            <td className="py-1">{line.vat_rate}%</td>
            <td className="py-1">
              <MoneyText amount={line.base} currency={currency} />
            </td>
            <td className="py-1">
              <MoneyText amount={line.vat_amount} currency={currency} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
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
