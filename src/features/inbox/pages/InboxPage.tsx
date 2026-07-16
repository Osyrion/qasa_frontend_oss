import { isAxiosError } from 'axios'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { toast } from 'sonner'

import {
  useDeleteInvoiceInboxId,
  useGetInvoiceInbox,
  usePostInvoiceInboxInboxItemIgnore,
  usePostInvoiceInboxUpload,
} from '@/api/generated/invoice-inbox/invoice-inbox'
import type { InvoiceInboxItem } from '@/api/generated/qASAAPIDocumentation.schemas'
import { ConvertInboxItemSheet } from '@/features/inbox/components/ConvertInboxItemSheet'
import { FileUpload, type FileUploadPreset } from '@/shared/components/FileUpload'
import { extractErrorMessage } from '@/shared/lib/laravel-errors'
import { queryClient } from '@/shared/lib/query-client'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Spinner } from '@/shared/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

const INBOX_UPLOAD_PRESET: FileUploadPreset = {
  accept: 'application/pdf,image/jpeg,image/png',
  allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  maxSizeBytes: 20 * 1024 * 1024,
}

// OCR runs synchronously inside the upload request — give it more room than the default axios timeout.
const UPLOAD_TIMEOUT_MS = 60_000

export function InboxPage() {
  const { t } = useTranslation('inbox')
  const [convertItem, setConvertItem] = useState<InvoiceInboxItem | null>(null)

  const items = useGetInvoiceInbox()

  const upload = usePostInvoiceInboxUpload({
    request: { timeout: UPLOAD_TIMEOUT_MS },
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ['/api/v1/invoice-inbox'] })
      },
      onError: (error) => {
        if (isAxiosError(error) && error.response?.status === 429) {
          toast.error(t('upload.throttled'))
          return
        }
        toast.error(extractErrorMessage(error) ?? t('upload.failed'))
      },
    },
  })

  const ignore = usePostInvoiceInboxInboxItemIgnore({
    mutation: {
      onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['/api/v1/invoice-inbox'] }),
      onError: (error) => toast.error(extractErrorMessage(error) ?? t('actions.ignore_failed')),
    },
  })

  const remove = useDeleteInvoiceInboxId({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ['/api/v1/invoice-inbox'] })
        toast.success(t('actions.deleted'))
      },
    },
  })

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t('list.title')}</h1>

      <FileUpload
        preset={INBOX_UPLOAD_PRESET}
        isUploading={upload.isPending}
        hint={upload.isPending ? t('upload.analyzing') : t('upload.hint')}
        onUpload={async (file) => {
          await upload.mutateAsync({ data: { file } })
        }}
      />

      {items.isPending ? (
        <Spinner />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('list.column_filename')}</TableHead>
              <TableHead>{t('list.column_status')}</TableHead>
              <TableHead>{t('list.column_ocr_engine')}</TableHead>
              <TableHead>{t('list.column_matched_client')}</TableHead>
              <TableHead>{t('list.column_error')}</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(items.data?.data ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  {t('list.empty')}
                </TableCell>
              </TableRow>
            ) : (
              (items.data?.data ?? []).map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.original_filename}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{t(`status.${item.status}`)}</Badge>
                  </TableCell>
                  <TableCell>{item.ocr_engine ?? '—'}</TableCell>
                  <TableCell>{item.matched_client?.display_name ?? '—'}</TableCell>
                  <TableCell className="max-w-48 truncate text-destructive">
                    {item.error ?? '—'}
                  </TableCell>
                  <TableCell className="flex justify-end gap-2">
                    {item.status === 'imported' && item.supplier_invoice_id ? (
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/supplier-invoices/${item.supplier_invoice_id}`}>
                          {t('actions.view_invoice')}
                        </Link>
                      </Button>
                    ) : (
                      (item.status === 'pending' || item.status === 'failed') && (
                        <Button variant="outline" size="sm" onClick={() => setConvertItem(item)}>
                          {t('actions.convert')}
                        </Button>
                      )
                    )}
                    {item.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={ignore.isPending}
                        onClick={() => item.id && ignore.mutate({ inboxItem: item.id })}
                      >
                        {t('actions.ignore')}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      disabled={remove.isPending}
                      onClick={() => item.id && remove.mutate({ id: item.id })}
                    >
                      {t('actions.delete')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      <ConvertInboxItemSheet
        item={convertItem}
        onOpenChange={(open) => !open && setConvertItem(null)}
      />
    </div>
  )
}
