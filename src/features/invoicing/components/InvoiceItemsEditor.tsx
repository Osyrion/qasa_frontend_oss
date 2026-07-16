import {
  useDeleteInvoicesInvoiceItemsItem,
  usePostInvoicesInvoiceItems,
} from '@/api/generated/invoices/invoices'
import type { InvoiceItem } from '@/api/generated/qASAAPIDocumentation.schemas'
import { DocumentItemsEditor } from '@/shared/components/DocumentItemsEditor'
import { queryClient } from '@/shared/lib/query-client'

interface InvoiceItemsEditorProps {
  invoiceId: string
  items: InvoiceItem[]
  currency: string
  editable: boolean
}

export function InvoiceItemsEditor({
  invoiceId,
  items,
  currency,
  editable,
}: InvoiceItemsEditorProps) {
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [`/api/v1/invoices/${invoiceId}`] })

  const addItem = usePostInvoicesInvoiceItems()
  const deleteItem = useDeleteInvoicesInvoiceItemsItem({
    mutation: { onSuccess: invalidate },
  })

  return (
    <DocumentItemsEditor
      items={items}
      currency={currency}
      editable={editable}
      namespace="invoices"
      isAdding={addItem.isPending}
      isDeleting={deleteItem.isPending}
      onAdd={async (values) => {
        await addItem.mutateAsync({ invoice: invoiceId, data: values })
        invalidate()
      }}
      onDelete={(item) => {
        if (item.id) deleteItem.mutate({ invoice: invoiceId, item: item.id })
      }}
    />
  )
}
