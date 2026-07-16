import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { usePostSupplierInvoicesSupplierInvoiceStatus } from '@/api/generated/supplier-invoices/supplier-invoices'
import type {
  PostSupplierInvoicesSupplierInvoiceStatusBodyStatus,
  SupplierInvoice,
} from '@/api/generated/qASAAPIDocumentation.schemas'
import { StatusTransitionMenu } from '@/shared/components/StatusTransitionMenu'
import { extractErrorMessage } from '@/shared/lib/laravel-errors'
import { queryClient } from '@/shared/lib/query-client'
import { getAvailableSupplierInvoiceTransitions } from '@/shared/lib/transitions'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Field, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'

// 'paid' isn't in this list — its own paid_at dialog + Confirm button already
// serves as the confirmation step, so a second generic window.confirm would be redundant.
const TERMINAL_TRANSITIONS: PostSupplierInvoicesSupplierInvoiceStatusBodyStatus[] = ['cancelled']

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

interface SupplierInvoiceStatusActionsProps {
  supplierInvoice: SupplierInvoice
}

export function SupplierInvoiceStatusActions({
  supplierInvoice,
}: SupplierInvoiceStatusActionsProps) {
  const { t } = useTranslation('supplierInvoices')
  const status = supplierInvoice.status ?? 'draft'
  const supplierInvoiceId = supplierInvoice.id
  const [paidAtDialogOpen, setPaidAtDialogOpen] = useState(false)
  const [paidAt, setPaidAt] = useState(todayIso())

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: [`/api/v1/supplier-invoices/${supplierInvoiceId}`],
    })
    void queryClient.invalidateQueries({ queryKey: ['/api/v1/supplier-invoices'] })
  }

  const updateStatus = usePostSupplierInvoicesSupplierInvoiceStatus({
    mutation: {
      onSuccess: () => {
        invalidate()
        setPaidAtDialogOpen(false)
        toast.success(t('actions.status_updated'))
      },
      onError: (error) => {
        toast.error(extractErrorMessage(error) ?? t('actions.status_update_failed'))
      },
    },
  })

  if (!supplierInvoiceId) return null

  const transition = (target: string) => {
    if (target === 'paid') {
      setPaidAt(todayIso())
      setPaidAtDialogOpen(true)
      return
    }
    updateStatus.mutate({
      supplierInvoice: supplierInvoiceId,
      data: { status: target as PostSupplierInvoicesSupplierInvoiceStatusBodyStatus },
    })
  }

  return (
    <>
      <StatusTransitionMenu
        triggerLabel={t('actions.change_status')}
        transitions={getAvailableSupplierInvoiceTransitions(status)}
        labelForStatus={(target) => t(`actions.transition_to.${target}`)}
        isPending={updateStatus.isPending}
        terminalTransitions={TERMINAL_TRANSITIONS}
        confirmMessage={(target) =>
          t('actions.confirm_terminal', { status: t(`status.${target}`) })
        }
        onTransition={(target) => transition(target)}
      />

      <Dialog open={paidAtDialogOpen} onOpenChange={setPaidAtDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('actions.mark_paid_title')}</DialogTitle>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="paid_at">{t('actions.paid_at')}</FieldLabel>
            <Input
              id="paid_at"
              type="date"
              value={paidAt}
              onChange={(event) => setPaidAt(event.target.value)}
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPaidAtDialogOpen(false)}>
              {t('actions.cancel')}
            </Button>
            <Button
              type="button"
              disabled={updateStatus.isPending}
              onClick={() =>
                updateStatus.mutate({
                  supplierInvoice: supplierInvoiceId,
                  data: { status: 'paid', paid_at: paidAt },
                })
              }
            >
              {t('actions.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
