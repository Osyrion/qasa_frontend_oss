import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'

import { postAuthGoogleCallback } from '@/api/generated/authentication/authentication'
import { AuthCard } from '@/features/auth/components/AuthCard'
import { deviceName } from '@/features/auth/device'
import { useAuthResponse } from '@/features/auth/use-auth-response'
import type { LaravelErrorPayload } from '@/shared/lib/laravel-errors'
import { isAxiosError } from 'axios'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Spinner } from '@/shared/ui/spinner'

export function GoogleCallbackPage() {
  const { t } = useTranslation('auth')
  const [searchParams] = useSearchParams()
  const handleAuthResponse = useAuthResponse()
  const [error, setError] = useState<string | null>(null)
  // The OAuth code is single-use — guard against StrictMode double-invoke.
  const submitted = useRef(false)

  const code = searchParams.get('code')

  useEffect(() => {
    if (!code || submitted.current) {
      return
    }
    submitted.current = true

    postAuthGoogleCallback({ code, device_name: deviceName() })
      .then(handleAuthResponse)
      .catch((requestError: unknown) => {
        const payload = isAxiosError(requestError)
          ? (requestError.response?.data as LaravelErrorPayload | null)
          : null
        setError(payload?.message ?? t('google.error'))
      })
  }, [code, handleAuthResponse, t])

  if (!code || error) {
    return (
      <AuthCard title={t('google.error_title')}>
        <div className="flex flex-col gap-4">
          <Alert variant="destructive">
            <AlertDescription>{error ?? t('google.missing_code')}</AlertDescription>
          </Alert>
          <Button asChild className="w-full">
            <Link to="/login">{t('google.back_to_login')}</Link>
          </Button>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard title={t('google.title')}>
      <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
        <Spinner />
        {t('google.connecting')}
      </div>
    </AuthCard>
  )
}
