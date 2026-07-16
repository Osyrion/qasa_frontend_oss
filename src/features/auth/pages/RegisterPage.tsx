import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'

import { usePostAuthRegister } from '@/api/generated/authentication/authentication'
import { AuthCard } from '@/features/auth/components/AuthCard'
import { deviceName } from '@/features/auth/device'
import { useAuthStore } from '@/features/auth/store'
import i18n from '@/shared/i18n'
import { TextField } from '@/shared/components/TextField'
import { applyLaravelErrors } from '@/shared/lib/laravel-errors'
import { Button } from '@/shared/ui/button'
import { FieldGroup } from '@/shared/ui/field'

export function RegisterPage() {
  const { t } = useTranslation('auth')
  const { t: tCommon } = useTranslation()
  const setSession = useAuthStore((state) => state.setSession)
  // Registration sits behind the backend QASA_REGISTRATION flag (404 when off).
  const [registrationDisabled, setRegistrationDisabled] = useState(false)

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, t('validation.required')),
        surname: z.string().min(1, t('validation.required')),
        email: z.email(t('validation.email')),
        password: z.string().min(8, t('validation.password_min')),
      }),
    [t],
  )

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) })

  const registerMutation = usePostAuthRegister({
    mutation: {
      onSuccess: (response) => {
        if (response.token && response.user) {
          setSession(response.token, response.user)
        }
      },
      onError: (error) => {
        if (isAxiosError(error) && error.response?.status === 404) {
          setRegistrationDisabled(true)
          return
        }
        const message = applyLaravelErrors(error, setError)
        if (message) {
          toast.error(message)
        } else if (!isAxiosError(error) || !error.response) {
          toast.error(tCommon('error_generic'))
        }
      },
    },
  })

  if (registrationDisabled) {
    return (
      <AuthCard title={t('register.disabled_title')} description={t('register.disabled_text')}>
        <Button asChild className="w-full">
          <Link to="/login">{t('register.back_to_login')}</Link>
        </Button>
      </AuthCard>
    )
  }

  return (
    <AuthCard title={t('register.title')}>
      <form
        onSubmit={handleSubmit((values) =>
          registerMutation.mutate({
            data: { ...values, locale: i18n.language, device_name: deviceName() },
          }),
        )}
        noValidate
      >
        <FieldGroup>
          <TextField
            id="name"
            autoComplete="given-name"
            label={t('register.name')}
            error={errors.name}
            {...register('name')}
          />
          <TextField
            id="surname"
            autoComplete="family-name"
            label={t('register.surname')}
            error={errors.surname}
            {...register('surname')}
          />
          <TextField
            id="email"
            type="email"
            autoComplete="email"
            label={t('register.email')}
            error={errors.email}
            {...register('email')}
          />
          <TextField
            id="password"
            type="password"
            autoComplete="new-password"
            label={t('register.password')}
            error={errors.password}
            {...register('password')}
          />
          <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
            {t('register.submit')}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {t('register.have_account')}{' '}
            <Link to="/login" className="underline">
              {t('register.login_link')}
            </Link>
          </p>
        </FieldGroup>
      </form>
    </AuthCard>
  )
}
