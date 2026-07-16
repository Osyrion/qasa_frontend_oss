import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'

import { getGetAuthMeQueryKey } from '@/api/generated/authentication/authentication'
import { apiClient } from '@/api/mutator'
import { AuthCard } from '@/features/auth/components/AuthCard'
import { useAuthStore } from '@/features/auth/store'
import { queryClient } from '@/shared/lib/query-client'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Spinner } from '@/shared/ui/spinner'

type Status = 'verifying' | 'success' | 'error'

function isSameOrigin(url: string, apiBase: string): boolean {
  try {
    return new URL(url).origin === new URL(apiBase, window.location.href).origin
  } catch {
    return false
  }
}

export function VerifyEmailPage() {
  const { t } = useTranslation('auth')
  const [searchParams] = useSearchParams()
  const url = searchParams.get('url')
  const [status, setStatus] = useState<Status>('verifying')
  // The signed link is single-use — guard against StrictMode double-invoke.
  const submitted = useRef(false)
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

    // The url param must point back at our own API — never forward the
    // request (and its Authorization header, if logged in) to another host.
    if (!url || !isSameOrigin(url, apiBase) || submitted.current) {
      if (!url || !isSameOrigin(url, apiBase)) setStatus('error')
      return
    }
    submitted.current = true

    apiClient
      .get(url)
      .then(() => {
        setStatus('success')
        if (token) {
          if (user) setUser({ ...user, email_verified: true })
          void queryClient.invalidateQueries({ queryKey: getGetAuthMeQueryKey() })
        }
      })
      .catch(() => setStatus('error'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])

  const continueTo = token ? '/dashboard' : '/login'

  if (status === 'verifying') {
    return (
      <AuthCard title={t('verify_email.title')}>
        <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
          <Spinner />
          {t('verify_email.verifying')}
        </div>
      </AuthCard>
    )
  }

  if (status === 'error') {
    return (
      <AuthCard title={t('verify_email.error_title')}>
        <div className="flex flex-col gap-4">
          <Alert variant="destructive">
            <AlertDescription>{t('verify_email.error_text')}</AlertDescription>
          </Alert>
          <Button asChild className="w-full">
            <Link to={continueTo}>{t('verify_email.back')}</Link>
          </Button>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard title={t('verify_email.success_title')} description={t('verify_email.success_text')}>
      <Button asChild className="w-full">
        <Link to={continueTo}>{t('verify_email.continue')}</Link>
      </Button>
    </AuthCard>
  )
}
