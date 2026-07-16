import { MailWarningIcon, XIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { usePostAuthEmailVerificationNotification } from '@/api/generated/authentication/authentication'
import { useAuthStore } from '@/features/auth/store'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'

const DISMISS_KEY = 'qasa-verify-banner-dismissed'
const RESEND_COOLDOWN_MS = 60_000

export function EmailVerificationBanner() {
  const { t } = useTranslation('auth')
  const user = useAuthStore((state) => state.user)
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISS_KEY) === '1')
  const [coolingDown, setCoolingDown] = useState(false)

  const resend = usePostAuthEmailVerificationNotification({
    mutation: {
      onSuccess: () => toast.success(t('verify_banner.sent')),
    },
  })

  if (user?.email_verified !== false || dismissed) {
    return null
  }

  const handleResend = () => {
    resend.mutate(undefined)
    setCoolingDown(true)
    setTimeout(() => setCoolingDown(false), RESEND_COOLDOWN_MS)
  }

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  return (
    <Alert className="mb-4 flex items-center justify-between gap-4">
      <MailWarningIcon />
      <AlertDescription className="flex-1">{t('verify_banner.text')}</AlertDescription>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          disabled={resend.isPending || coolingDown}
          onClick={handleResend}
        >
          {t('verify_banner.resend')}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          aria-label={t('verify_banner.dismiss')}
          onClick={handleDismiss}
        >
          <XIcon />
        </Button>
      </div>
    </Alert>
  )
}
