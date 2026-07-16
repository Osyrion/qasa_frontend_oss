import { isAxiosError } from 'axios'
import { FileTextIcon, PencilIcon, TrashIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'

import { useDeleteOrdersId, useGetOrdersId } from '@/api/generated/orders/orders'
import { GenerateInvoiceDialog } from '@/features/orders/components/GenerateInvoiceDialog'
import { OrderAttachmentsCard } from '@/features/orders/components/OrderAttachmentsCard'
import { OrderItemsEditor } from '@/features/orders/components/OrderItemsEditor'
import { OrderNotesCard } from '@/features/orders/components/OrderNotesCard'
import { isOrderEditable } from '@/features/orders/lib/order-status'
import { DateText } from '@/shared/components/DateText'
import { MoneyText } from '@/shared/components/MoneyText'
import { extractErrorMessage } from '@/shared/lib/laravel-errors'
import { queryClient } from '@/shared/lib/query-client'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'

export function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation('orders')
  const { t: tCommon } = useTranslation()
  const [generateOpen, setGenerateOpen] = useState(false)

  const order = useGetOrdersId(id ?? '', { query: { enabled: Boolean(id) } })

  const deleteOrder = useDeleteOrdersId({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ['/api/v1/orders'] })
        toast.success(t('detail.deleted'))
        void navigate('/orders')
      },
      onError: (error) => {
        if (isAxiosError(error) && error.response?.status === 422) {
          toast.error(t('detail.delete_failed_has_invoices'))
          return
        }
        toast.error(extractErrorMessage(error) ?? t('detail.delete_failed_has_invoices'))
      },
    },
  })

  if (!id) {
    return <Navigate to="/orders" replace />
  }

  if (order.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!order.data) {
    return <Navigate to="/orders" replace />
  }

  const data = order.data
  const status = data.status ?? 'active'
  const editable = isOrderEditable(status)
  const canGenerateInvoice = Boolean(data.client?.id)

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className="size-3 shrink-0 rounded-full"
            style={{ backgroundColor: data.color ?? '#94a3b8' }}
          />
          <h1 className="text-2xl font-semibold">{data.name}</h1>
          <Badge variant="secondary">{t(`status.${status}`)}</Badge>
        </div>
        <div className="flex gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button
                  variant="outline"
                  disabled={!canGenerateInvoice}
                  onClick={() => setGenerateOpen(true)}
                >
                  <FileTextIcon />
                  {t('detail.generate_invoice')}
                </Button>
              </span>
            </TooltipTrigger>
            {!canGenerateInvoice && (
              <TooltipContent>{t('generate_invoice.no_client')}</TooltipContent>
            )}
          </Tooltip>
          {editable && (
            <Button asChild variant="outline">
              <Link to={`/orders/${id}/edit`}>
                <PencilIcon />
                {tCommon('edit')}
              </Link>
            </Button>
          )}
          <Button
            variant="outline"
            className="text-destructive"
            onClick={() => {
              if (window.confirm(tCommon('confirm_delete'))) {
                deleteOrder.mutate({ id })
              }
            }}
          >
            <TrashIcon />
            {tCommon('delete')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('detail.overview')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <DetailRow label={t('form.client')}>
            {data.client?.display_name ?? t('list.personal_placeholder')}
          </DetailRow>
          <DetailRow label={t('form.billing_type')}>
            {data.billing_type ? t(`billing_type.${data.billing_type}`) : '—'}
          </DetailRow>
          <DetailRow label={t('form.rate')}>
            {data.rate != null ? (
              <MoneyText amount={data.rate} currency={data.effective_currency ?? 'EUR'} />
            ) : (
              '—'
            )}
          </DetailRow>
          <DetailRow label={t('form.deadline')}>
            <DateText value={data.deadline} variant="date-only" />
          </DetailRow>
          {data.readme && (
            <div className="col-span-2">
              <DetailRow label={t('form.readme')}>{data.readme}</DetailRow>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="items">
        <TabsList>
          <TabsTrigger value="items">{t('detail.tab_items')}</TabsTrigger>
          <TabsTrigger value="notes">{t('detail.tab_notes')}</TabsTrigger>
          <TabsTrigger value="attachments">{t('detail.tab_attachments')}</TabsTrigger>
        </TabsList>
        <TabsContent value="items">
          <OrderItemsEditor
            orderId={id}
            items={data.items ?? []}
            currency={data.effective_currency ?? 'EUR'}
            editable={editable}
          />
        </TabsContent>
        <TabsContent value="notes">
          <Card>
            <CardContent className="pt-6">
              <OrderNotesCard orderId={id} notes={data.notes ?? []} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="attachments">
          <Card>
            <CardContent className="pt-6">
              <OrderAttachmentsCard orderId={id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <GenerateInvoiceDialog order={data} open={generateOpen} onOpenChange={setGenerateOpen} />
    </div>
  )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="text-muted-foreground">{label}</span>
      <span>{children}</span>
    </div>
  )
}
