import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'

import { usePostAuthResetPassword } from '@/api/generated/authentication/authentication'
import { AuthCard } from '@/features/auth/components/AuthCard'
import { TextField } from '@/shared/components/TextField'
import { applyLaravelErrors } from '@/shared/lib/laravel-errors'
import { Button } from '@/shared/ui/button'
import { FieldGroup } from '@/shared/ui/field'

export function ResetPasswordPage() {
  const { t } = useTranslation('auth')
  const { t: tCommon } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  const schema = useMemo(
    () =>
      z
        .object({
          password: z.string().min(8, t('validation.password_min')),
          password_confirmation: z.string(),
        })
        .refine((values) => values.password === values.password_confirmation, {
          path: ['password_confirmation'],
          message: t('validation.password_mismatch'),
        }),
    [t],
  )

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) })

  const resetPassword = usePostAuthResetPassword({
    mutation: {
      onSuccess: () => {
        toast.success(t('reset.success'))
        void navigate('/login')
      },
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

  if (!token || !email) {
    return (
      <AuthCard title={t('reset.invalid_title')} description={t('reset.invalid_text')}>
        <Button asChild className="w-full">
          <Link to="/forgot-password">{t('reset.request_new')}</Link>
        </Button>
      </AuthCard>
    )
  }

  return (
    <AuthCard title={t('reset.title')}>
      <form
        onSubmit={handleSubmit((values) =>
          resetPassword.mutate({ data: { token, email, password: values.password } }),
        )}
        noValidate
      >
        <FieldGroup>
          <TextField
            id="password"
            type="password"
            autoComplete="new-password"
            label={t('reset.password')}
            error={errors.password}
            {...register('password')}
          />
          <TextField
            id="password_confirmation"
            type="password"
            autoComplete="new-password"
            label={t('reset.password_confirmation')}
            error={errors.password_confirmation}
            {...register('password_confirmation')}
          />
          <Button type="submit" className="w-full" disabled={resetPassword.isPending}>
            {t('reset.submit')}
          </Button>
        </FieldGroup>
      </form>
    </AuthCard>
  )
}
