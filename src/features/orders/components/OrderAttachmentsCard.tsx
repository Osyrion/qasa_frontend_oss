import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  useDeleteOrdersOrderAttachmentsAttachment,
  useGetOrdersOrderAttachments,
  usePostOrdersOrderAttachments,
} from '@/api/generated/order-attachments/order-attachments'
import { AttachmentList } from '@/shared/components/AttachmentList'
import { FileUpload, type FileUploadPreset } from '@/shared/components/FileUpload'
import { queryClient } from '@/shared/lib/query-client'

const ORDER_ATTACHMENT_PRESET: FileUploadPreset = {
  accept:
    'image/jpeg,image/png,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv',
  allowedMimeTypes: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ],
  maxSizeBytes: 20 * 1024 * 1024,
}

interface OrderAttachmentsCardProps {
  orderId: string
}

export function OrderAttachmentsCard({ orderId }: OrderAttachmentsCardProps) {
  const { t } = useTranslation('orders')

  const attachments = useGetOrdersOrderAttachments(orderId)

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [`/api/v1/orders/${orderId}/attachments`] })

  const upload = usePostOrdersOrderAttachments({
    mutation: {
      onSuccess: invalidate,
      onError: () => toast.error(t('attachments.upload_failed')),
    },
  })

  const remove = useDeleteOrdersOrderAttachmentsAttachment({
    mutation: { onSuccess: invalidate },
  })

  return (
    <div className="flex flex-col gap-4">
      <AttachmentList
        attachments={attachments.data ?? []}
        strategy={{ kind: 'href', getHref: (attachment) => attachment.url }}
        onDelete={(attachment) => {
          if (attachment.id) remove.mutate({ order: orderId, attachment: attachment.id })
        }}
        isDeleting={remove.isPending}
      />
      <FileUpload
        preset={ORDER_ATTACHMENT_PRESET}
        isUploading={upload.isPending}
        onUpload={async (file) => {
          await upload.mutateAsync({ order: orderId, data: { file } })
        }}
      />
    </div>
  )
}
