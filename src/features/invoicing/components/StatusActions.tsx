import { isAxiosError } from 'axios'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import {
  usePostInvoicesInvoiceCorrective,
  usePostInvoicesInvoiceRemind,
  usePostInvoicesInvoiceSettle,
  usePostInvoicesInvoiceStatus,
} from '@/api/generated/invoices/invoices'
import {
  PostInvoicesInvoiceCorrectiveBodyType,
  type Invoice,
  type PostInvoicesInvoiceStatusBodyStatus,
} from '@/api/generated/qASAAPIDocumentation.schemas'
import {
  canCreateCorrective,
  canRemind,
  getAvailableTransitions,
} from '@/features/invoicing/lib/status-transitions'
import { extractErrorMessage } from '@/shared/lib/laravel-errors'
import { queryClient } from '@/shared/lib/query-client'
import { Button } from '@/shared/ui/button'

interface StatusActionsProps {
  invoice: Invoice
}

export function StatusActions({ invoice }: StatusActionsProps) {
  const { t } = useTranslation('invoices')
  const navigate = useNavigate()
  const status = invoice.status ?? 'draft'
  const invoiceId = invoice.id

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: [`/api/v1/invoices/${invoiceId}`] })
    void queryClient.invalidateQueries({ queryKey: ['/api/v1/invoices'] })
  }

  const updateStatus = usePostInvoicesInvoiceStatus({
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

  const remind = usePostInvoicesInvoiceRemind({
    mutation: {
      onSuccess: () => {
        invalidate()
        toast.success(t('actions.reminded'))
      },
      onError: (error) => {
        if (isAxiosError(error) && error.response?.status === 429) {
          toast.error(t('actions.throttled'))
          return
        }
        toast.error(extractErrorMessage(error) ?? t('actions.remind_failed'))
      },
    },
  })

  const corrective = usePostInvoicesInvoiceCorrective({
    mutation: {
      onSuccess: (created) => {
        invalidate()
        toast.success(t('actions.corrective_created'))
        if (created.id) void navigate(`/invoices/${created.id}`)
      },
      onError: (error) => {
        toast.error(extractErrorMessage(error) ?? t('actions.corrective_failed'))
      },
    },
  })

  const settle = usePostInvoicesInvoiceSettle({
    mutation: {
      onSuccess: (created) => {
        invalidate()
        toast.success(t('actions.settled'))
        if (created.id) void navigate(`/invoices/${created.id}`)
      },
      onError: (error) => {
        toast.error(extractErrorMessage(error) ?? t('actions.settle_failed'))
      },
    },
  })

  if (!invoiceId) return null

  const transitions = getAvailableTransitions(status)

  return (
    <div className="flex flex-wrap gap-2">
      {transitions.map((target) => (
        <Button
          key={target}
          variant="outline"
          disabled={updateStatus.isPending}
          onClick={() =>
            updateStatus.mutate({
              invoice: invoiceId,
              data: { status: target as PostInvoicesInvoiceStatusBodyStatus },
            })
          }
        >
          {t(`actions.transition_to.${target}`)}
        </Button>
      ))}

      {canRemind(status) && (
        <Button
          variant="outline"
          disabled={remind.isPending}
          onClick={() => remind.mutate({ invoice: invoiceId })}
        >
          {t('actions.remind')}
        </Button>
      )}

      {canCreateCorrective(status) && (
        <>
          <Button
            variant="outline"
            disabled={corrective.isPending}
            onClick={() =>
              corrective.mutate({
                invoice: invoiceId,
                data: { type: PostInvoicesInvoiceCorrectiveBodyType.credit_note },
              })
            }
          >
            {t('actions.create_credit_note')}
          </Button>
          <Button
            variant="outline"
            className="text-destructive"
            disabled={corrective.isPending}
            onClick={() => {
              if (window.confirm(t('actions.confirm_storno'))) {
                corrective.mutate({
                  invoice: invoiceId,
                  data: { type: PostInvoicesInvoiceCorrectiveBodyType.storno },
                })
              }
            }}
          >
            {t('actions.create_storno')}
          </Button>
        </>
      )}

      {invoice.type === 'proforma' && (
        <Button
          variant="outline"
          disabled={settle.isPending}
          onClick={() => settle.mutate({ invoice: invoiceId })}
        >
          {t('actions.settle')}
        </Button>
      )}
    </div>
  )
}
