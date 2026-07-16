import {
  useDeleteQuotesQuoteItemsItem,
  usePostQuotesQuoteItems,
} from '@/api/generated/quotes/quotes'
import type { QuoteItem } from '@/api/generated/qASAAPIDocumentation.schemas'
import { DocumentItemsEditor } from '@/shared/components/DocumentItemsEditor'
import { queryClient } from '@/shared/lib/query-client'

interface QuoteItemsEditorProps {
  quoteId: string
  items: QuoteItem[]
  currency: string
  editable: boolean
}

export function QuoteItemsEditor({ quoteId, items, currency, editable }: QuoteItemsEditorProps) {
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [`/api/v1/quotes/${quoteId}`] })

  const addItem = usePostQuotesQuoteItems()
  const deleteItem = useDeleteQuotesQuoteItemsItem({
    mutation: { onSuccess: invalidate },
  })

  return (
    <DocumentItemsEditor
      items={items}
      currency={currency}
      editable={editable}
      namespace="quotes"
      isAdding={addItem.isPending}
      isDeleting={deleteItem.isPending}
      onAdd={async (values) => {
        await addItem.mutateAsync({ quote: quoteId, data: values })
        invalidate()
      }}
      onDelete={(item) => {
        if (item.id) deleteItem.mutate({ quote: quoteId, item: item.id })
      }}
    />
  )
}
