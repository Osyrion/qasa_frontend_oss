import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'

import { usePostAuth2faVerify } from '@/api/generated/two-factor/two-factor'
import { AuthCard } from '@/features/auth/components/AuthCard'
import { deviceName } from '@/features/auth/device'
import { useAuthStore } from '@/features/auth/store'
import { syncLocale } from '@/shared/i18n'
import { TextField } from '@/shared/components/TextField'
import { applyLaravelErrors, type LaravelErrorPayload } from '@/shared/lib/laravel-errors'
import { Button } from '@/shared/ui/button'
import { FieldGroup } from '@/shared/ui/field'

export function TwoFactorPage() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const [useRecovery, setUseRecovery] = useState(false)
  const challengeToken = useAuthStore((state) => state.challengeToken)
  const setChallengeToken = useAuthStore((state) => state.setChallengeToken)
  const setSession = useAuthStore((state) => state.setSession)

  const schema = useMemo(() => z.object({ code: z.string().min(1, t('validation.required')) }), [t])

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) })

  const verify = usePostAuth2faVerify({
    mutation: {
      onSuccess: (response) => {
        if (response.token && response.user) {
          syncLocale(response.user.locale)
          setSession(response.token, response.user)
        }
      },
      onError: (error) => {
        // An invalid/expired challenge cannot be retried — back to login.
        if (isAxiosError(error) && error.response?.status === 422) {
          const payload = error.response.data as unknown as LaravelErrorPayload | null
          if (payload?.errors?.challenge_token) {
            toast.error(payload.errors.challenge_token[0] ?? payload.message ?? '')
            setChallengeToken(null)
            void navigate('/login')
            return
          }
        }
        const message = applyLaravelErrors(error, setError)
        if (message) {
          toast.error(message)
        }
      },
    },
  })

  if (!challengeToken) {
    return <Navigate to="/login" replace />
  }

  return (
    <AuthCard title={t('two_factor.title')} description={t('two_factor.description')}>
      <form
        onSubmit={handleSubmit((values) =>
          verify.mutate({
            data: {
              challenge_token: challengeToken,
              code: values.code,
              device_name: deviceName(),
            },
          }),
        )}
        noValidate
      >
        <FieldGroup>
          <TextField
            id="code"
            autoComplete="one-time-code"
            inputMode={useRecovery ? 'text' : 'numeric'}
            label={useRecovery ? t('two_factor.recovery_code') : t('two_factor.code')}
            error={errors.code}
            {...register('code')}
          />
          <Button type="submit" className="w-full" disabled={verify.isPending}>
            {t('two_factor.submit')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => setUseRecovery((value) => !value)}
          >
            {useRecovery ? t('two_factor.use_code') : t('two_factor.use_recovery')}
          </Button>
          <p className="text-center text-sm">
            <Link to="/login" className="text-muted-foreground underline">
              {t('two_factor.back_to_login')}
            </Link>
          </p>
        </FieldGroup>
      </form>
    </AuthCard>
  )
}
