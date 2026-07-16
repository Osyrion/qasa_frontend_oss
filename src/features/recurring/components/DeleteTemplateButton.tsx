import { TrashIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useDeleteRecurringInvoiceTemplatesId } from '@/api/generated/recurring-invoice-templates/recurring-invoice-templates'
import type { RecurringInvoiceTemplate } from '@/api/generated/qASAAPIDocumentation.schemas'
import { extractErrorMessage } from '@/shared/lib/laravel-errors'
import { queryClient } from '@/shared/lib/query-client'
import { Button } from '@/shared/ui/button'

interface DeleteTemplateButtonProps {
  template: RecurringInvoiceTemplate
}

export function DeleteTemplateButton({ template }: DeleteTemplateButtonProps) {
  const { t } = useTranslation('recurring')
  const { t: tCommon } = useTranslation()
  const templateId = template.id

  const deleteTemplate = useDeleteRecurringInvoiceTemplatesId({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ['/api/v1/recurring-invoice-templates'] })
        toast.success(t('detail.deleted'))
      },
      onError: (error) => toast.error(extractErrorMessage(error) ?? tCommon('error_generic')),
    },
  })

  if (!templateId) {
    return null
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-destructive"
      aria-label={tCommon('delete')}
      disabled={deleteTemplate.isPending}
      onClick={() => {
        if (window.confirm(tCommon('confirm_delete'))) {
          deleteTemplate.mutate({ id: templateId })
        }
      }}
    >
      <TrashIcon />
    </Button>
  )
}
