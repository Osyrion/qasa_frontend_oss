import { DownloadIcon, FileIcon, FileTextIcon, ImageIcon, TrashIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/shared/ui/button'

export interface AttachmentLike {
  id?: string
  display_name?: string
  size_human?: string
  is_image?: boolean
  is_pdf?: boolean
}

type AttachmentStrategy<T extends AttachmentLike> =
  | { kind: 'href'; getHref: (attachment: T) => string | undefined }
  | { kind: 'download'; onDownload: (attachment: T) => void; isDownloading?: boolean }

interface AttachmentListProps<T extends AttachmentLike> {
  attachments: T[]
  strategy: AttachmentStrategy<T>
  onDelete?: (attachment: T) => void
  isDeleting?: boolean
  emptyMessage?: string
}

function AttachmentIcon({ attachment }: { attachment: AttachmentLike }) {
  if (attachment.is_image) return <ImageIcon className="size-4 shrink-0 text-muted-foreground" />
  if (attachment.is_pdf) return <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
  return <FileIcon className="size-4 shrink-0 text-muted-foreground" />
}

export function AttachmentList<T extends AttachmentLike>({
  attachments,
  strategy,
  onDelete,
  isDeleting = false,
  emptyMessage,
}: AttachmentListProps<T>) {
  const { t } = useTranslation()

  if (attachments.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage ?? t('attachments.empty')}</p>
  }

  return (
    <ul className="flex flex-col divide-y rounded-lg border">
      {attachments.map((attachment, index) => (
        <li key={attachment.id ?? index} className="flex items-center gap-3 px-3 py-2 text-sm">
          <AttachmentIcon attachment={attachment} />
          <span className="min-w-0 flex-1 truncate">{attachment.display_name}</span>
          {attachment.size_human && (
            <span className="shrink-0 text-xs text-muted-foreground">{attachment.size_human}</span>
          )}
          {strategy.kind === 'href' ? (
            <Button asChild variant="ghost" size="sm" aria-label={t('attachments.download')}>
              <a href={strategy.getHref(attachment)} target="_blank" rel="noreferrer">
                <DownloadIcon />
              </a>
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={t('attachments.download')}
              disabled={strategy.isDownloading}
              onClick={() => strategy.onDownload(attachment)}
            >
              <DownloadIcon />
            </Button>
          )}
          {onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              aria-label={t('attachments.delete')}
              disabled={isDeleting}
              onClick={() => onDelete(attachment)}
            >
              <TrashIcon />
            </Button>
          )}
        </li>
      ))}
    </ul>
  )
}
