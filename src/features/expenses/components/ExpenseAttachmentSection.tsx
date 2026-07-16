import { DownloadIcon, TrashIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  useDeleteExpensesExpenseAttachment,
  useGetExpensesExpenseAttachment,
  usePostExpensesExpenseAttachment,
} from '@/api/generated/expense-attachments/expense-attachments'
import type { ExpenseAttachment } from '@/api/generated/qASAAPIDocumentation.schemas'
import { FileUpload, type FileUploadPreset } from '@/shared/components/FileUpload'
import { triggerBlobDownload } from '@/shared/lib/download'
import { queryClient } from '@/shared/lib/query-client'
import { Button } from '@/shared/ui/button'

const EXPENSE_ATTACHMENT_PRESET: FileUploadPreset = {
  accept: 'image/jpeg,image/png,image/webp,application/pdf',
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
  maxSizeBytes: 20 * 1024 * 1024,
}

interface ExpenseAttachmentSectionProps {
  expenseId: string
  attachment: ExpenseAttachment | null | undefined
}

export function ExpenseAttachmentSection({ expenseId, attachment }: ExpenseAttachmentSectionProps) {
  const { t } = useTranslation('expenses')
  const [downloading, setDownloading] = useState(false)

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: [`/api/v1/expenses/${expenseId}`] })
    void queryClient.invalidateQueries({ queryKey: ['/api/v1/expenses'] })
  }

  const upload = usePostExpensesExpenseAttachment({
    mutation: {
      onSuccess: invalidate,
      onError: () => toast.error(t('attachment.upload_failed')),
    },
  })

  const remove = useDeleteExpensesExpenseAttachment({
    mutation: {
      onSuccess: invalidate,
      onError: () => toast.error(t('attachment.delete_failed')),
    },
  })

  const download = useGetExpensesExpenseAttachment(expenseId, { query: { enabled: false } })

  const handleUpload = async (file: File) => {
    if (attachment && !window.confirm(t('attachment.replace_confirm'))) return
    await upload.mutateAsync({ expense: expenseId, data: { file } })
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const result = await download.refetch()
      if (result.data) triggerBlobDownload(result.data, attachment?.filename ?? 'attachment')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {attachment ? (
        <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
          <span className="truncate">{attachment.filename}</span>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={t('attachment.download')}
              disabled={downloading}
              onClick={() => void handleDownload()}
            >
              <DownloadIcon />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              aria-label={t('attachment.delete')}
              disabled={remove.isPending}
              onClick={() => remove.mutate({ expense: expenseId })}
            >
              <TrashIcon />
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t('attachment.empty')}</p>
      )}

      <FileUpload
        preset={EXPENSE_ATTACHMENT_PRESET}
        isUploading={upload.isPending}
        onUpload={handleUpload}
      />
    </div>
  )
}
