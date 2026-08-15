import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'

import {
  getAuthRegistryLookup,
  usePostAuthCompleteResidency,
} from '@/api/generated/taxation/taxation'
import { PostAuthCompleteResidencyBodyCountry } from '@/api/generated/qASAAPIDocumentation.schemas'
import { useAuthStore } from '@/features/auth/store'
import { TextField } from '@/shared/components/TextField'
import { applyLaravelErrors, extractErrorMessage } from '@/shared/lib/laravel-errors'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Field, FieldGroup, FieldLabel } from '@/shared/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Spinner } from '@/shared/ui/spinner'

const COUNTRIES = Object.values(PostAuthCompleteResidencyBodyCountry)

interface FormValues {
  country: PostAuthCompleteResidencyBodyCountry
  ico: string
  dic: string
  vat_id: string
  company_name: string
  address: string
  city: string
  postal_code: string
}

function defaultValues(): FormValues {
  return {
    country: PostAuthCompleteResidencyBodyCountry.SK,
    ico: '',
    dic: '',
    vat_id: '',
    company_name: '',
    address: '',
    city: '',
    postal_code: '',
  }
}

export function ResidencyOnboardingPage() {
  const { t } = useTranslation('onboarding')
  const { t: tCommon } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const setUser = useAuthStore((state) => state.setUser)
  const [isLookingUp, setIsLookingUp] = useState(false)

  const schema = z.object({
    country: z.enum(COUNTRIES),
    ico: z.string().min(1, t('validation.ico_required')).max(20),
    dic: z.string().max(20),
    vat_id: z.string().max(20),
    company_name: z.string().min(1, t('validation.company_name_required')).max(255),
    address: z.string().min(1, t('validation.address_required')).max(255),
    city: z.string().min(1, t('validation.city_required')).max(100),
    postal_code: z.string().min(1, t('validation.postal_code_required')).max(10),
  })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(),
  })

  const country = watch('country')
  const ico = watch('ico')

  const complete = usePostAuthCompleteResidency({
    mutation: {
      onSuccess: (response) => {
        if (!response.data) return
        setUser(response.data)
        toast.success(t('completed_toast'))
        const from = (location.state as { from?: Location } | null)?.from
        void navigate(from ? `${from.pathname}${from.search}` : '/dashboard', { replace: true })
      },
      onError: (error) => {
        const message = applyLaravelErrors(error, setError)
        if (message) toast.error(message)
      },
    },
  })

  const onLookup = async () => {
    if (!ico.trim()) {
      setError('ico', { type: 'manual', message: t('validation.ico_required') })
      return
    }
    setIsLookingUp(true)
    try {
      const result = await getAuthRegistryLookup({ country, ico: ico.trim() })
      if (result.company_name) setValue('company_name', result.company_name)
      if (result.dic) setValue('dic', result.dic)
      if (result.vat_id) setValue('vat_id', result.vat_id)
      if (result.address) setValue('address', result.address)
      if (result.city) setValue('city', result.city)
      if (result.postal_code) setValue('postal_code', result.postal_code)
      toast.success(t('lookup_success'))
    } catch (error) {
      toast.error(extractErrorMessage(error) ?? t('lookup_failed'))
    } finally {
      setIsLookingUp(false)
    }
  }

  const onSubmit: SubmitHandler<FormValues> = (values) => {
    complete.mutate({
      data: {
        country: values.country,
        ico: values.ico,
        dic: values.dic || null,
        vat_id: values.vat_id || null,
        company_name: values.company_name,
        address: values.address,
        city: values.city,
        postal_code: values.postal_code,
      },
    })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/40 p-4">
      <div className="text-2xl font-semibold">{tCommon('app_name')}</div>
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
            <FieldGroup>
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="onboarding-country">{t('country')}</FieldLabel>
                  <Select
                    value={country}
                    onValueChange={(value) =>
                      setValue('country', value as PostAuthCompleteResidencyBodyCountry)
                    }
                  >
                    <SelectTrigger id="onboarding-country">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {t(`country_option.${value}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <TextField
                      id="onboarding-ico"
                      label={t('ico')}
                      error={errors.ico}
                      {...register('ico')}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isLookingUp}
                    onClick={() => void onLookup()}
                  >
                    {isLookingUp ? <Spinner /> : t('lookup_action')}
                  </Button>
                </div>
              </div>

              <TextField
                id="onboarding-company-name"
                label={t('company_name')}
                error={errors.company_name}
                {...register('company_name')}
              />

              <div className="grid grid-cols-2 gap-3">
                <TextField id="onboarding-dic" label={t('dic')} {...register('dic')} />
                <TextField id="onboarding-vat-id" label={t('vat_id')} {...register('vat_id')} />
              </div>

              <TextField
                id="onboarding-address"
                label={t('address')}
                error={errors.address}
                {...register('address')}
              />

              <div className="grid grid-cols-2 gap-3">
                <TextField
                  id="onboarding-city"
                  label={t('city')}
                  error={errors.city}
                  {...register('city')}
                />
                <TextField
                  id="onboarding-postal-code"
                  label={t('postal_code')}
                  error={errors.postal_code}
                  {...register('postal_code')}
                />
              </div>

              <p className="text-xs text-muted-foreground">{t('immutable_hint')}</p>

              <Button type="submit" className="w-full" disabled={complete.isPending}>
                {t('submit')}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
