import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'

import {
  usePostQuotesQuoteConvertToInvoice,
  usePostQuotesQuoteConvertToOrder,
  usePostQuotesQuoteStatus,
} from '@/api/generated/quotes/quotes'
import type {
  PostQuotesQuoteStatusBodyStatus,
  Quote,
} from '@/api/generated/qASAAPIDocumentation.schemas'
import { StatusTransitionMenu } from '@/shared/components/StatusTransitionMenu'
import { extractErrorMessage } from '@/shared/lib/laravel-errors'
import { queryClient } from '@/shared/lib/query-client'
import { getAvailableQuoteTransitions } from '@/shared/lib/transitions'
import { Button } from '@/shared/ui/button'

const TERMINAL_TRANSITIONS: PostQuotesQuoteStatusBodyStatus[] = ['accepted', 'rejected', 'expired']

interface QuoteStatusActionsProps {
  quote: Quote
}

export function QuoteStatusActions({ quote }: QuoteStatusActionsProps) {
  const { t } = useTranslation('quotes')
  const navigate = useNavigate()
  const status = quote.status ?? 'draft'
  const quoteId = quote.id

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: [`/api/v1/quotes/${quoteId}`] })
    void queryClient.invalidateQueries({ queryKey: ['/api/v1/quotes'] })
  }

  const updateStatus = usePostQuotesQuoteStatus({
    mutation: {
      onSuccess: () => {
        invalidate()
        toast.success(t('actions.status_updated'))
      },
      onError: (error) => {
        toast.error(extractErrorMessage(error) ?? t('actions.status_update_failed'))
      },
    },
  })

  const convertToInvoice = usePostQuotesQuoteConvertToInvoice({
    mutation: {
      onSuccess: (invoice) => {
        invalidate()
        toast.success(t('actions.converted'))
        if (invoice.id) void navigate(`/invoices/${invoice.id}`)
      },
      onError: (error) => {
        toast.error(extractErrorMessage(error) ?? t('actions.convert_failed'))
      },
    },
  })

  const convertToOrder = usePostQuotesQuoteConvertToOrder({
    mutation: {
      onSuccess: (order) => {
        invalidate()
        toast.success(t('actions.converted'))
        if (order.id) void navigate(`/orders/${order.id}`)
      },
      onError: (error) => {
        toast.error(extractErrorMessage(error) ?? t('actions.convert_failed'))
      },
    },
  })

  if (!quoteId) return null

  const canConvert = status === 'sent' || status === 'accepted'
  const isConverting = convertToInvoice.isPending || convertToOrder.isPending

  return (
    <div className="flex flex-wrap items-center gap-2">
      <StatusTransitionMenu
        triggerLabel={t('actions.change_status')}
        transitions={getAvailableQuoteTransitions(status)}
        labelForStatus={(target) => t(`actions.transition_to.${target}`)}
        isPending={updateStatus.isPending}
        terminalTransitions={TERMINAL_TRANSITIONS}
        confirmMessage={(target) =>
          t('actions.confirm_terminal', { status: t(`status.${target}`) })
        }
        onTransition={(target) =>
          updateStatus.mutate({
            quote: quoteId,
            data: { status: target as PostQuotesQuoteStatusBodyStatus },
          })
        }
      />

      {quote.converted_invoice_id ? (
        <Button asChild variant="outline">
          <Link to={`/invoices/${quote.converted_invoice_id}`}>{t('actions.view_invoice')}</Link>
        </Button>
      ) : (
        canConvert && (
          <Button
            variant="outline"
            disabled={isConverting}
            onClick={() => convertToInvoice.mutate({ quote: quoteId })}
          >
            {t('actions.convert_to_invoice')}
          </Button>
        )
      )}

      {quote.converted_order_id ? (
        <Button asChild variant="outline">
          <Link to={`/orders/${quote.converted_order_id}`}>{t('actions.view_order')}</Link>
        </Button>
      ) : (
        canConvert && (
          <Button
            variant="outline"
            disabled={isConverting}
            onClick={() => convertToOrder.mutate({ quote: quoteId })}
          >
            {t('actions.convert_to_order')}
          </Button>
        )
      )}
    </div>
  )
}
