import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'

import {
  getAuthGoogleRedirect,
  usePostAuthLogin,
} from '@/api/generated/authentication/authentication'
import { AuthCard } from '@/features/auth/components/AuthCard'
import { deviceName } from '@/features/auth/device'
import { useAuthResponse } from '@/features/auth/use-auth-response'
import { TextField } from '@/shared/components/TextField'
import { applyLaravelErrors } from '@/shared/lib/laravel-errors'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { FieldGroup, FieldSeparator } from '@/shared/ui/field'

export function LoginPage() {
  const { t } = useTranslation('auth')
  const { t: tCommon } = useTranslation()
  const [searchParams] = useSearchParams()
  const handleAuthResponse = useAuthResponse()

  const schema = useMemo(
    () =>
      z.object({
        email: z.email(t('validation.email')),
        password: z.string().min(1, t('validation.required')),
      }),
    [t],
  )

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) })

  const login = usePostAuthLogin({
    mutation: {
      onSuccess: handleAuthResponse,
      onError: (error) => {
        const message = applyLaravelErrors(error, setError)
        if (message) {
          toast.error(message)
        } else if (!isAxiosError(error) || !error.response) {
          toast.error(tCommon('error_generic'))
        }
      },
    },
  })

  const onGoogleLogin = async () => {
    try {
      const { url } = await getAuthGoogleRedirect()
      if (url) {
        window.location.assign(url)
      }
    } catch {
      toast.error(tCommon('error_generic'))
    }
  }

  return (
    <AuthCard title={t('login.title')}>
      {searchParams.get('expired') ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{t('login.session_expired')}</AlertDescription>
        </Alert>
      ) : null}

      <form
        onSubmit={handleSubmit((values) =>
          login.mutate({ data: { ...values, device_name: deviceName() } }),
        )}
        noValidate
      >
        <FieldGroup>
          <TextField
            id="email"
            type="email"
            autoComplete="email"
            label={t('login.email')}
            error={errors.email}
            {...register('email')}
          />
          <TextField
            id="password"
            type="password"
            autoComplete="current-password"
            label={t('login.password')}
            error={errors.password}
            {...register('password')}
          />
          <div className="text-right text-sm">
            <Link to="/forgot-password" className="text-muted-foreground underline">
              {t('login.forgot_password')}
            </Link>
          </div>
          <Button type="submit" className="w-full" disabled={login.isPending}>
            {t('login.submit')}
          </Button>
          <FieldSeparator>{t('login.or')}</FieldSeparator>
          <Button type="button" variant="outline" className="w-full" onClick={onGoogleLogin}>
            {t('login.google')}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {t('login.no_account')}{' '}
            <Link to="/register" className="underline">
              {t('login.register_link')}
            </Link>
          </p>
        </FieldGroup>
      </form>
    </AuthCard>
  )
}
