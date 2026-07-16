import { isAxiosError } from 'axios'
import { TrashIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  useDeleteOrdersOrderNotesNote,
  usePostOrdersOrderNotes,
} from '@/api/generated/order-notes/order-notes'
import type { OrderNote } from '@/api/generated/qASAAPIDocumentation.schemas'
import { DateText } from '@/shared/components/DateText'
import { extractErrorMessage } from '@/shared/lib/laravel-errors'
import { queryClient } from '@/shared/lib/query-client'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/textarea'

interface OrderNotesCardProps {
  orderId: string
  notes: OrderNote[]
}

export function OrderNotesCard({ orderId, notes }: OrderNotesCardProps) {
  const { t } = useTranslation('orders')
  const [content, setContent] = useState('')

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [`/api/v1/orders/${orderId}`] })

  const addNote = usePostOrdersOrderNotes({
    mutation: {
      onSuccess: () => {
        invalidate()
        setContent('')
        toast.success(t('notes.added'))
      },
    },
  })

  const deleteNote = useDeleteOrdersOrderNotesNote({
    mutation: {
      onSuccess: invalidate,
      onError: (error) => {
        if (isAxiosError(error) && error.response?.status === 403) {
          toast.error(t('notes.delete_forbidden'))
          return
        }
        toast.error(extractErrorMessage(error) ?? t('notes.delete_forbidden'))
      },
    },
  })

  return (
    <div className="flex flex-col gap-4">
      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('notes.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {notes.map((note) => (
            <li
              key={note.id}
              className="flex items-start justify-between gap-2 rounded-lg border p-3 text-sm"
            >
              <div className="flex flex-col gap-1">
                <span className="whitespace-pre-wrap">{note.content}</span>
                <span className="text-xs text-muted-foreground">
                  <DateText value={note.created_at} />
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                disabled={deleteNote.isPending}
                onClick={() => {
                  if (note.id) deleteNote.mutate({ order: orderId, note: note.id })
                }}
              >
                <TrashIcon />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (content.trim()) addNote.mutate({ order: orderId, data: { content } })
        }}
        className="flex flex-col gap-2"
      >
        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder={t('notes.placeholder')}
        />
        <Button type="submit" disabled={addNote.isPending || !content.trim()} className="self-end">
          {t('notes.add')}
        </Button>
      </form>
    </div>
  )
}
