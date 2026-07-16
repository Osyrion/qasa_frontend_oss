import { useTranslation } from 'react-i18next'

import {
  useDeleteOrdersOrderItemsItem,
  usePostOrdersOrderItems,
  usePutOrdersOrderItemsItem,
} from '@/api/generated/order-items/order-items'
import type { OrderItem } from '@/api/generated/qASAAPIDocumentation.schemas'
import { DocumentItemsEditor } from '@/shared/components/DocumentItemsEditor'
import { queryClient } from '@/shared/lib/query-client'

interface OrderItemsEditorProps {
  orderId: string
  items: OrderItem[]
  currency: string
  editable: boolean
}

export function OrderItemsEditor({ orderId, items, currency, editable }: OrderItemsEditorProps) {
  const { t } = useTranslation('orders')

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [`/api/v1/orders/${orderId}`] })

  const addItem = usePostOrdersOrderItems()
  const updateItem = usePutOrdersOrderItemsItem()
  const deleteItem = useDeleteOrdersOrderItemsItem({
    mutation: { onSuccess: invalidate },
  })

  const typeOptions = [
    { value: 'service', label: t('items.type_service') },
    { value: 'product', label: t('items.type_product') },
    { value: 'time', label: t('items.type_time') },
  ]

  return (
    <DocumentItemsEditor
      items={items}
      currency={currency}
      editable={editable}
      namespace="orders"
      typeOptions={typeOptions}
      isAdding={addItem.isPending}
      isUpdating={updateItem.isPending}
      isDeleting={deleteItem.isPending}
      onAdd={async (values) => {
        await addItem.mutateAsync({
          order: orderId,
          data: {
            ...values,
            type: (values.type ?? 'service') as 'service' | 'product' | 'time',
            unit: values.unit ?? 'ks',
          },
        })
        invalidate()
      }}
      onUpdate={async (item, values) => {
        if (!item.id) return
        await updateItem.mutateAsync({
          order: orderId,
          item: item.id,
          data: {
            ...values,
            type: (values.type ?? 'service') as 'service' | 'product' | 'time',
            unit: values.unit ?? 'ks',
          },
        })
        invalidate()
      }}
      onDelete={(item) => {
        if (item.id) deleteItem.mutate({ order: orderId, item: item.id })
      }}
    />
  )
}
