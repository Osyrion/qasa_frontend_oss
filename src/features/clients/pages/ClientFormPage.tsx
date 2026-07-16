import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'

import { useGetClientsId, usePostClients, usePutClientsId } from '@/api/generated/clients/clients'
import {
  PostClientsBodyClientType,
  PostClientsBodyCurrency,
  type Client,
  type PostClientsBody,
} from '@/api/generated/qASAAPIDocumentation.schemas'
import { queryClient } from '@/shared/lib/query-client'
import {
  ClientLookupField,
  type CompanyLookupResult,
} from '@/features/clients/components/ClientLookupField'
import { VatVerifyBadge } from '@/features/clients/components/VatVerifyBadge'
import { TextField } from '@/shared/components/TextField'
import { applyLaravelErrors } from '@/shared/lib/laravel-errors'
import { AVAILABLE_LOCALES } from '@/shared/i18n'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import { Field, FieldGroup, FieldLabel } from '@/shared/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Textarea } from '@/shared/ui/textarea'

const CLIENT_TYPES = Object.values(PostClientsBodyClientType)
const CURRENCIES = Object.values(PostClientsBodyCurrency)

interface ClientFormValues {
  client_type: PostClientsBodyClientType
  title: string
  name: string
  surname: string
  company_name: string
  ico: string
  dic: string
  vat_id: string
  is_vat_payer: boolean
  is_customer: boolean
  is_vendor: boolean
  email: string
  phone: string
  address: string
  city: string
  postal_code: string
  country: string
  currency: PostClientsBodyCurrency
  locale: string
  note: string
}

function defaultValues(locale: string): ClientFormValues {
  return {
    client_type: PostClientsBodyClientType.individual,
    title: '',
    name: '',
    surname: '',
    company_name: '',
    ico: '',
    dic: '',
    vat_id: '',
    is_vat_payer: false,
    is_customer: true,
    is_vendor: false,
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'SK',
    currency: PostClientsBodyCurrency.EUR,
    locale,
    note: '',
  }
}

function clientToFormValues(client: Client): ClientFormValues {
  return {
    client_type: (client.client_type ??
      PostClientsBodyClientType.individual) as PostClientsBodyClientType,
    title: client.title ?? '',
    name: client.name ?? '',
    surname: client.surname ?? '',
    company_name: client.company_name ?? '',
    ico: client.ico ?? '',
    dic: client.dic ?? '',
    vat_id: client.vat_id ?? '',
    is_vat_payer: client.is_vat_payer ?? false,
    is_customer: client.is_customer ?? true,
    is_vendor: client.is_vendor ?? false,
    email: client.email ?? '',
    phone: client.phone ?? '',
    address: client.address ?? '',
    city: client.city ?? '',
    postal_code: client.postal_code ?? '',
    country: client.country ?? 'SK',
    currency: (client.currency ?? PostClientsBodyCurrency.EUR) as PostClientsBodyCurrency,
    locale: client.locale ?? 'sk',
    note: client.note ?? '',
  }
}

function toRequestBody(values: ClientFormValues): PostClientsBody {
  const orNull = (value: string) => (value.trim() ? value.trim() : null)
  return {
    client_type: values.client_type,
    title: orNull(values.title),
    name: orNull(values.name),
    surname: orNull(values.surname),
    company_name: orNull(values.company_name),
    ico: orNull(values.ico),
    dic: orNull(values.dic),
    vat_id: orNull(values.vat_id),
    is_vat_payer: values.is_vat_payer,
    is_customer: values.is_customer,
    is_vendor: values.is_vendor,
    email: orNull(values.email),
    phone: orNull(values.phone),
    address: orNull(values.address),
    city: orNull(values.city),
    postal_code: orNull(values.postal_code),
    country: values.country.trim().toUpperCase(),
    currency: values.currency,
    locale: values.locale,
    note: orNull(values.note),
  }
}

export function ClientFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { t, i18n } = useTranslation('clients')
  const { t: tCommon } = useTranslation()

  const existing = useGetClientsId(id ?? '', { query: { enabled: isEdit } })

  const schema = useMemo(
    () =>
      z
        .object({
          client_type: z.enum(CLIENT_TYPES),
          title: z.string().max(100),
          name: z.string().max(150),
          surname: z.string().max(150),
          company_name: z.string().max(200),
          ico: z.string().max(20),
          dic: z.string().max(20),
          vat_id: z.string().max(20),
          is_vat_payer: z.boolean(),
          is_customer: z.boolean(),
          is_vendor: z.boolean(),
          email: z.string().max(255),
          phone: z.string().max(30),
          address: z.string().max(255),
          city: z.string().max(100),
          postal_code: z.string().max(10),
          country: z.string().length(2, t('validation.country_length')),
          currency: z.enum(CURRENCIES),
          locale: z.string().max(5),
          note: z.string(),
        })
        .refine(
          (data) => data.client_type === 'company' || (data.name.trim() && data.surname.trim()),
          {
            path: ['name'],
            message: t('validation.name_required'),
          },
        )
        .refine((data) => data.client_type !== 'company' || data.company_name.trim(), {
          path: ['company_name'],
          message: t('validation.company_name_required'),
        })
        .refine((data) => data.is_customer || data.is_vendor, {
          path: ['is_customer'],
          message: t('validation.role_required'),
        })
        .refine((data) => !data.email || z.email().safeParse(data.email).success, {
          path: ['email'],
          message: t('validation.email'),
        }),
    [t],
  )

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(i18n.language),
  })

  useEffect(() => {
    if (existing.data) {
      reset(clientToFormValues(existing.data))
    }
  }, [existing.data, reset])

  const clientType = watch('client_type')
  const vatId = watch('vat_id')
  const country = watch('country')

  const createMutation = usePostClients({
    mutation: {
      onSuccess: (client) => {
        void queryClient.invalidateQueries({ queryKey: ['/api/v1/clients'] })
        toast.success(t('form.created'))
        void navigate(`/clients/${client.id}`)
      },
      onError: (error) => {
        const message = applyLaravelErrors(error, setError)
        if (message) toast.error(message)
      },
    },
  })

  const updateMutation = usePutClientsId({
    mutation: {
      onSuccess: (client) => {
        void queryClient.invalidateQueries({ queryKey: ['/api/v1/clients'] })
        toast.success(t('form.updated'))
        void navigate(`/clients/${client.id}`)
      },
      onError: (error) => {
        const message = applyLaravelErrors(error, setError)
        if (message) toast.error(message)
      },
    },
  })

  const onSubmit: SubmitHandler<ClientFormValues> = (values) => {
    const body = toRequestBody(values)
    if (isEdit && id) {
      updateMutation.mutate({ id, data: body })
    } else {
      createMutation.mutate({ data: body })
    }
  }

  const applyLookupResult = (result: CompanyLookupResult) => {
    if (result.company_name) setValue('company_name', result.company_name)
    if (result.ico) setValue('ico', result.ico)
    if (result.dic) setValue('dic', result.dic)
    if (result.vat_id) setValue('vat_id', result.vat_id)
    if (result.address) setValue('address', result.address)
    if (result.city) setValue('city', result.city)
    if (result.postal_code) setValue('postal_code', result.postal_code)
    setValue('country', result.country)
    setValue('client_type', PostClientsBodyClientType.company)
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">
        {isEdit ? t('form.edit_title') : t('form.create_title')}
      </h1>

      {!isEdit && <ClientLookupField onFound={applyLookupResult} />}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="client_type">{t('form.client_type')}</FieldLabel>
            <Select
              value={clientType}
              onValueChange={(value) => setValue('client_type', value as PostClientsBodyClientType)}
            >
              <SelectTrigger id="client_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CLIENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(`client_type.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {clientType === 'company' ? (
            <TextField
              id="company_name"
              label={t('form.company_name')}
              error={errors.company_name}
              {...register('company_name')}
            />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <TextField
                id="name"
                label={t('form.name')}
                error={errors.name}
                {...register('name')}
              />
              <TextField
                id="surname"
                label={t('form.surname')}
                error={errors.surname}
                {...register('surname')}
              />
            </div>
          )}

          <TextField
            id="title"
            label={t('form.title')}
            error={errors.title}
            {...register('title')}
          />

          <div className="grid grid-cols-2 gap-3">
            <TextField id="ico" label={t('form.ico')} error={errors.ico} {...register('ico')} />
            <TextField id="dic" label={t('form.dic')} error={errors.dic} {...register('dic')} />
          </div>

          <div className="flex flex-col gap-2">
            <TextField
              id="vat_id"
              label={t('form.vat_id')}
              error={errors.vat_id}
              {...register('vat_id')}
            />
            {vatId && (
              <VatVerifyBadge
                country={country.slice(0, 2)}
                vatId={vatId}
                clientId={id}
                wasVerified={Boolean(existing.data?.vat_verified_at)}
              />
            )}
          </div>

          <Field orientation="horizontal">
            <Checkbox
              id="is_vat_payer"
              checked={watch('is_vat_payer')}
              onCheckedChange={(checked) => setValue('is_vat_payer', checked === true)}
            />
            <FieldLabel htmlFor="is_vat_payer">{t('form.is_vat_payer')}</FieldLabel>
          </Field>

          <div className="flex gap-6">
            <Field orientation="horizontal">
              <Checkbox
                id="is_customer"
                checked={watch('is_customer')}
                onCheckedChange={(checked) => setValue('is_customer', checked === true)}
              />
              <FieldLabel htmlFor="is_customer">{t('role.customer')}</FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <Checkbox
                id="is_vendor"
                checked={watch('is_vendor')}
                onCheckedChange={(checked) => setValue('is_vendor', checked === true)}
              />
              <FieldLabel htmlFor="is_vendor">{t('role.vendor')}</FieldLabel>
            </Field>
          </div>
          {errors.is_customer && (
            <p className="text-sm text-destructive">{errors.is_customer.message}</p>
          )}

          <TextField
            id="email"
            type="email"
            label={t('form.email')}
            error={errors.email}
            {...register('email')}
          />
          <TextField
            id="phone"
            label={t('form.phone')}
            error={errors.phone}
            {...register('phone')}
          />
          <TextField
            id="address"
            label={t('form.address')}
            error={errors.address}
            {...register('address')}
          />
          <div className="grid grid-cols-2 gap-3">
            <TextField id="city" label={t('form.city')} error={errors.city} {...register('city')} />
            <TextField
              id="postal_code"
              label={t('form.postal_code')}
              error={errors.postal_code}
              {...register('postal_code')}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextField
              id="country"
              label={t('form.country')}
              error={errors.country}
              maxLength={2}
              {...register('country')}
            />
            <Field>
              <FieldLabel htmlFor="currency">{t('form.currency')}</FieldLabel>
              <Select
                value={watch('currency')}
                onValueChange={(value) => setValue('currency', value as PostClientsBodyCurrency)}
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="locale">{t('form.locale')}</FieldLabel>
            <Select value={watch('locale')} onValueChange={(value) => setValue('locale', value)}>
              <SelectTrigger id="locale">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_LOCALES.map((locale) => (
                  <SelectItem key={locale} value={locale}>
                    {locale.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="note">{t('form.note')}</FieldLabel>
            <Textarea id="note" {...register('note')} />
          </Field>

          <div className="flex gap-2">
            <Button type="submit" disabled={isPending}>
              {tCommon('save')}
            </Button>
            <Button type="button" variant="outline" onClick={() => void navigate(-1)}>
              {tCommon('cancel')}
            </Button>
          </div>
        </FieldGroup>
      </form>
    </div>
  )
}
