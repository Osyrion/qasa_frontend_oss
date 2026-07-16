import { DownloadIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useParams } from 'react-router'
import { toast } from 'sonner'

import {
  getInvoicesIdPdfDownload,
  useGetInvoicesIdPdfPreview,
} from '@/api/generated/invoice-pdf/invoice-pdf'
import { useGetInvoicesId } from '@/api/generated/invoices/invoices'
import { triggerBlobDownload } from '@/shared/lib/download'
import { Button } from '@/shared/ui/button'
import { Spinner } from '@/shared/ui/spinner'

export function InvoicePdfPage() {
  const { id } = useParams()
  const { t } = useTranslation('invoices')
  const [downloading, setDownloading] = useState(false)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)

  const invoice = useGetInvoicesId(id ?? '', { query: { enabled: Boolean(id) } })
  const preview = useGetInvoicesIdPdfPreview(id ?? '', { query: { enabled: Boolean(id) } })

  useEffect(() => {
    if (!preview.data) return
    const url = URL.createObjectURL(preview.data)
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [preview.data])

  if (!id) {
    return <Navigate to="/invoices" replace />
  }

  const filename = (
    invoiceNumber: string | null | undefined,
    issuedAt: string | null | undefined,
  ) => `${invoiceNumber ?? 'draft'}_${issuedAt ?? ''}.pdf`

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const blob = await getInvoicesIdPdfDownload(id)
      triggerBlobDownload(blob, filename(invoice.data?.invoice_number, invoice.data?.issued_at))
    } catch {
      toast.error(t('detail.pdf_download_failed'))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {invoice.data?.invoice_number ?? t('list.draft_placeholder')}
        </h1>
        <Button onClick={() => void handleDownload()} disabled={downloading}>
          <DownloadIcon />
          {t('detail.pdf_download')}
        </Button>
      </div>

      {preview.isPending || !objectUrl ? (
        <div className="flex flex-1 items-center justify-center">
          <Spinner className="size-8" />
        </div>
      ) : (
        <iframe src={objectUrl} title="PDF" className="h-[80vh] w-full rounded-lg border" />
      )}
    </div>
  )
}
