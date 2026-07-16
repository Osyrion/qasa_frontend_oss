import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  usePostRecurringInvoiceTemplatesTemplatePause,
  usePostRecurringInvoiceTemplatesTemplateResume,
} from '@/api/generated/recurring-invoice-templates/recurring-invoice-templates'
import type { RecurringInvoiceTemplate } from '@/api/generated/qASAAPIDocumentation.schemas'
import { extractErrorMessage } from '@/shared/lib/laravel-errors'
import { queryClient } from '@/shared/lib/query-client'
import { Button } from '@/shared/ui/button'

interface PauseResumeButtonProps {
  template: RecurringInvoiceTemplate
}

export function PauseResumeButton({ template }: PauseResumeButtonProps) {
  const { t } = useTranslation('recurring')
  const templateId = template.id

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: [`/api/v1/recurring-invoice-templates/${templateId}`],
    })
    void queryClient.invalidateQueries({ queryKey: ['/api/v1/recurring-invoice-templates'] })
  }

  const pause = usePostRecurringInvoiceTemplatesTemplatePause({
    mutation: {
      onSuccess: () => {
        invalidate()
        toast.success(t('pause_resume.paused'))
      },
      onError: (error) => toast.error(extractErrorMessage(error) ?? t('pause_resume.failed')),
    },
  })

  const resume = usePostRecurringInvoiceTemplatesTemplateResume({
    mutation: {
      onSuccess: () => {
        invalidate()
        toast.success(t('pause_resume.resumed'))
      },
      onError: (error) => toast.error(extractErrorMessage(error) ?? t('pause_resume.failed')),
    },
  })

  if (!templateId || (template.status !== 'active' && template.status !== 'paused')) {
    return null
  }

  if (template.status === 'active') {
    return (
      <Button
        variant="outline"
        disabled={pause.isPending}
        onClick={() => pause.mutate({ template: templateId })}
      >
        {t('pause_resume.pause')}
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      disabled={resume.isPending}
      onClick={() => resume.mutate({ template: templateId })}
    >
      {t('pause_resume.resume')}
    </Button>
  )
}
