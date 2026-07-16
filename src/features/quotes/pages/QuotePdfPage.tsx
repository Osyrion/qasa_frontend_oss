import { DownloadIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useParams } from 'react-router'
import { toast } from 'sonner'

import {
  getQuotesQuotePdfDownload,
  useGetQuotesId,
  useGetQuotesQuotePdfPreview,
} from '@/api/generated/quotes/quotes'
import { triggerBlobDownload } from '@/shared/lib/download'
import { Button } from '@/shared/ui/button'
import { Spinner } from '@/shared/ui/spinner'

export function QuotePdfPage() {
  const { id } = useParams()
  const { t } = useTranslation('quotes')
  const [downloading, setDownloading] = useState(false)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)

  const quote = useGetQuotesId(id ?? '', { query: { enabled: Boolean(id) } })
  const preview = useGetQuotesQuotePdfPreview(id ?? '', { query: { enabled: Boolean(id) } })

  useEffect(() => {
    if (!preview.data) return
    const url = URL.createObjectURL(preview.data)
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [preview.data])

  if (!id) {
    return <Navigate to="/quotes" replace />
  }

  const filename = (quoteNumber: string | null | undefined, issuedAt: string | null | undefined) =>
    `${quoteNumber ?? 'draft'}_${issuedAt ?? ''}.pdf`

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const blob = await getQuotesQuotePdfDownload(id)
      triggerBlobDownload(blob, filename(quote.data?.quote_number, quote.data?.issued_at))
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
          {quote.data?.quote_number ?? t('list.draft_placeholder')}
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
