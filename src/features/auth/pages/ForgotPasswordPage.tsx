import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'

import { usePostAuthForgotPassword } from '@/api/generated/authentication/authentication'
import { AuthCard } from '@/features/auth/components/AuthCard'
import { TextField } from '@/shared/components/TextField'
import { applyLaravelErrors } from '@/shared/lib/laravel-errors'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { FieldGroup } from '@/shared/ui/field'

export function ForgotPasswordPage() {
  const { t } = useTranslation('auth')
  const { t: tCommon } = useTranslation()
  const [sent, setSent] = useState(false)

  const schema = useMemo(() => z.object({ email: z.email(t('validation.email')) }), [t])

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) })

  const forgotPassword = usePostAuthForgotPassword({
    mutation: {
      onSuccess: () => setSent(true),
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

  return (
    <AuthCard title={t('forgot.title')} description={t('forgot.description')}>
      {sent ? (
        <div className="flex flex-col gap-4">
          <Alert>
            <AlertDescription>{t('forgot.sent')}</AlertDescription>
          </Alert>
          <Button asChild variant="outline" className="w-full">
            <Link to="/login">{t('forgot.back_to_login')}</Link>
          </Button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit((values) => forgotPassword.mutate({ data: values }))}
          noValidate
        >
          <FieldGroup>
            <TextField
              id="email"
              type="email"
              autoComplete="email"
              label={t('forgot.email')}
              error={errors.email}
              {...register('email')}
            />
            <Button type="submit" className="w-full" disabled={forgotPassword.isPending}>
              {t('forgot.submit')}
            </Button>
            <p className="text-center text-sm">
              <Link to="/login" className="text-muted-foreground underline">
                {t('forgot.back_to_login')}
              </Link>
            </p>
          </FieldGroup>
        </form>
      )}
    </AuthCard>
  )
}
