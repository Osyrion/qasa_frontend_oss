import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import {
  getProfileExport,
  useDeleteProfile,
  useGetAuthMe,
  usePostAuthProfileLogo,
  usePutAuthProfile,
} from '@/api/generated/authentication/authentication'
import {
  PutAuthProfileBodyDefaultCurrency,
  type PutAuthProfileBody,
  type User,
} from '@/api/generated/qASAAPIDocumentation.schemas'
import { useAuthStore } from '@/features/auth/store'
import { AVAILABLE_LOCALES, syncLocale } from '@/shared/i18n'
import { TextField } from '@/shared/components/TextField'
import { applyLaravelErrors, extractErrorMessage } from '@/shared/lib/laravel-errors'
import { triggerBlobDownload } from '@/shared/lib/download'
import { queryClient } from '@/shared/lib/query-client'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Checkbox } from '@/shared/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Textarea } from '@/shared/ui/textarea'

const CURRENCIES = Object.values(PutAuthProfileBodyDefaultCurrency)
type CurrencyValue = (typeof CURRENCIES)[number]

interface ProfileFormValues {
  title: string
  name: string
  surname: string
  email: string
  phone: string
  password: string
  ico: string
  dic: string
  vat_id: string
  is_vat_payer: boolean
  tax_flat_rate: string
  default_currency: CurrencyValue
  invoice_prefix: string
  invoice_number_mask: string
  invoice_number_start: string
  locale: string
  country: string
  address: string
  city: string
  postal_code: string
  website: string
  invoice_footer_text: string
  overdue_reminder_days: string
}

function userToFormValues(user: User): ProfileFormValues {
  return {
    title: user.title ?? '',
    name: user.name ?? '',
    surname: user.surname ?? '',
    email: user.email ?? '',
    phone: user.phone ?? '',
    password: '',
    ico: user.ico ?? '',
    dic: user.dic ?? '',
    vat_id: user.vat_id ?? '',
    is_vat_payer: user.is_vat_payer ?? false,
    tax_flat_rate: user.tax_flat_rate?.toString() ?? '',
    default_currency: (user.default_currency ??
      PutAuthProfileBodyDefaultCurrency.EUR) as CurrencyValue,
    invoice_prefix: user.invoice_prefix ?? '',
    invoice_number_mask: user.invoice_number_mask ?? '',
    invoice_number_start: user.invoice_number_start?.toString() ?? '',
    locale: user.locale ?? 'sk',
    country: user.country ?? '',
    address: user.address ?? '',
    city: user.city ?? '',
    postal_code: user.postal_code ?? '',
    website: user.website ?? '',
    invoice_footer_text: user.invoice_footer_text ?? '',
    overdue_reminder_days: user.overdue_reminder_days?.toString() ?? '',
  }
}

function toRequestBody(values: ProfileFormValues): PutAuthProfileBody {
  const orNull = (value: string) => (value.trim() ? value.trim() : null)
  const numberOrNull = (value: string) => (value.trim() ? Number(value) : null)

  return {
    title: orNull(values.title),
    name: orNull(values.name),
    surname: orNull(values.surname),
    email: orNull(values.email),
    phone: orNull(values.phone),
    password: values.password.trim() ? values.password : undefined,
    ico: orNull(values.ico),
    dic: orNull(values.dic),
    vat_id: orNull(values.vat_id),
    is_vat_payer: values.is_vat_payer,
    tax_flat_rate: numberOrNull(values.tax_flat_rate),
    default_currency: values.default_currency,
    invoice_prefix: orNull(values.invoice_prefix),
    invoice_number_mask: orNull(values.invoice_number_mask),
    invoice_number_start: numberOrNull(values.invoice_number_start),
    locale: orNull(values.locale),
    country: orNull(values.country),
    address: orNull(values.address),
    city: orNull(values.city),
    postal_code: orNull(values.postal_code),
    website: orNull(values.website),
    invoice_footer_text: orNull(values.invoice_footer_text),
    overdue_reminder_days: numberOrNull(values.overdue_reminder_days),
  }
}

export function ProfilePage() {
  const { t } = useTranslation('settings')
  const { t: tCommon } = useTranslation()
  const setUser = useAuthStore((state) => state.setUser)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  const me = useGetAuthMe()

  const schema = useMemo(
    () =>
      z.object({
        title: z.string().max(100),
        name: z.string().min(1, tCommon('error_generic')).max(100),
        surname: z.string().min(1, tCommon('error_generic')).max(100),
        email: z.email(),
        phone: z.string().max(30),
        password: z.string().refine((value) => !value || value.length >= 8, {
          message: t('profile.password_min'),
        }),
        ico: z.string().max(20),
        dic: z.string().max(20),
        vat_id: z.string().max(20),
        is_vat_payer: z.boolean(),
        tax_flat_rate: z.string(),
        default_currency: z.enum(CURRENCIES),
        invoice_prefix: z.string().max(10),
        invoice_number_mask: z.string().max(40),
        invoice_number_start: z.string(),
        locale: z.string().max(5),
        country: z.string().max(2),
        address: z.string(),
        city: z.string().max(100),
        postal_code: z.string().max(10),
        website: z.string().max(150),
        invoice_footer_text: z.string().max(1000),
        overdue_reminder_days: z.string(),
      }),
    [t, tCommon],
  )

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues: userToFormValues(me.data ?? {}),
  })

  useEffect(() => {
    if (me.data) {
      reset(userToFormValues(me.data))
    }
  }, [me.data, reset])

  const updateMutation = usePutAuthProfile({
    mutation: {
      onSuccess: (user) => {
        setUser(user)
        syncLocale(user.locale)
        void queryClient.invalidateQueries({ queryKey: ['/api/v1/auth/me'] })
        toast.success(t('profile.saved'))
        reset(userToFormValues(user))
      },
      onError: (error) => {
        const message = applyLaravelErrors(error, setError)
        if (message) toast.error(message)
      },
    },
  })

  const logoMutation = usePostAuthProfileLogo({
    mutation: {
      onSuccess: (user) => {
        setUser(user)
        setLogoFile(null)
        toast.success(t('profile.logo_uploaded'))
      },
      onError: (error) => {
        toast.error(extractErrorMessage(error) ?? t('profile.logo_upload_failed'))
      },
    },
  })

  const deleteMutation = useDeleteProfile({
    mutation: {
      onSuccess: () => {
        toast.success(t('profile.deleted'))
        useAuthStore.getState().clear()
        window.location.assign('/login')
      },
      onError: (error) => {
        toast.error(extractErrorMessage(error) ?? tCommon('error_generic'))
      },
    },
  })

  const onSubmit: SubmitHandler<ProfileFormValues> = (values) => {
    updateMutation.mutate({ data: toRequestBody(values) })
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const blob = await getProfileExport({ responseType: 'blob' })
      triggerBlobDownload(
        blob as unknown as Blob,
        `qasa-export-${new Date().toISOString().slice(0, 10)}.json`,
      )
    } catch (error) {
      toast.error(extractErrorMessage(error) ?? t('profile.export_failed'))
    } finally {
      setIsExporting(false)
    }
  }

  const user = me.data

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t('profile.title')}</h1>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('profile.identity_section')}</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  id="name"
                  label={t('profile.name')}
                  error={errors.name}
                  {...register('name')}
                />
                <TextField
                  id="surname"
                  label={t('profile.surname')}
                  error={errors.surname}
                  {...register('surname')}
                />
              </div>
              <TextField
                id="title_field"
                label={t('profile.title_field')}
                error={errors.title}
                {...register('title')}
              />
              <TextField
                id="email"
                type="email"
                label={t('profile.email')}
                error={errors.email}
                {...register('email')}
              />
              <TextField
                id="phone"
                label={t('profile.phone')}
                error={errors.phone}
                {...register('phone')}
              />
              <TextField
                id="password"
                type="password"
                autoComplete="new-password"
                label={t('profile.password')}
                error={errors.password}
                {...register('password')}
              />
              <p className="text-sm text-muted-foreground">{t('profile.password_hint')}</p>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('profile.identity_section')}</CardTitle>
            <CardDescription>{t('profile.invoicing_section')}</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  id="ico"
                  label={t('profile.ico')}
                  error={errors.ico}
                  {...register('ico')}
                />
                <TextField
                  id="dic"
                  label={t('profile.dic')}
                  error={errors.dic}
                  {...register('dic')}
                />
              </div>
              <TextField
                id="vat_id"
                label={t('profile.vat_id')}
                error={errors.vat_id}
                {...register('vat_id')}
              />
              <Field orientation="horizontal">
                <Checkbox
                  id="is_vat_payer"
                  checked={watch('is_vat_payer')}
                  onCheckedChange={(checked) => setValue('is_vat_payer', checked === true)}
                />
                <FieldLabel htmlFor="is_vat_payer">{t('profile.is_vat_payer')}</FieldLabel>
              </Field>
              <TextField
                id="tax_flat_rate"
                type="number"
                label={t('profile.tax_flat_rate')}
                error={errors.tax_flat_rate}
                {...register('tax_flat_rate')}
              />
              <TextField
                id="address"
                label={t('profile.address')}
                error={errors.address}
                {...register('address')}
              />
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  id="city"
                  label={t('profile.city')}
                  error={errors.city}
                  {...register('city')}
                />
                <TextField
                  id="postal_code"
                  label={t('profile.postal_code')}
                  error={errors.postal_code}
                  {...register('postal_code')}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  id="country"
                  label={t('profile.country')}
                  maxLength={2}
                  error={errors.country}
                  {...register('country')}
                />
                <TextField
                  id="website"
                  label={t('profile.website')}
                  error={errors.website}
                  {...register('website')}
                />
              </div>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('profile.invoicing_section')}</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="default_currency">
                    {t('profile.default_currency')}
                  </FieldLabel>
                  <Select
                    value={watch('default_currency')}
                    onValueChange={(value) => setValue('default_currency', value as CurrencyValue)}
                  >
                    <SelectTrigger id="default_currency">
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
                <Field>
                  <FieldLabel htmlFor="locale">{t('profile.locale')}</FieldLabel>
                  <Select
                    value={watch('locale')}
                    onValueChange={(value) => setValue('locale', value)}
                  >
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
              </div>
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  id="invoice_prefix"
                  label={t('profile.invoice_prefix')}
                  error={errors.invoice_prefix}
                  {...register('invoice_prefix')}
                />
                <TextField
                  id="invoice_number_start"
                  type="number"
                  label={t('profile.invoice_number_start')}
                  error={errors.invoice_number_start}
                  {...register('invoice_number_start')}
                />
              </div>
              <TextField
                id="invoice_number_mask"
                label={t('profile.invoice_number_mask')}
                error={errors.invoice_number_mask}
                {...register('invoice_number_mask')}
              />
              <TextField
                id="overdue_reminder_days"
                type="number"
                label={t('profile.overdue_reminder_days')}
                error={errors.overdue_reminder_days}
                {...register('overdue_reminder_days')}
              />
              <Field>
                <FieldLabel htmlFor="invoice_footer_text">
                  {t('profile.invoice_footer_text')}
                </FieldLabel>
                <Textarea id="invoice_footer_text" {...register('invoice_footer_text')} />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={updateMutation.isPending}>
            {tCommon('save')}
          </Button>
        </div>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>{t('profile.logo_section')}</CardTitle>
          <CardDescription>{t('profile.logo_hint')}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          {user?.logo_path && (
            <img
              src={`${import.meta.env.VITE_API_URL ?? 'http://localhost:8000'}/storage/${user.logo_path}`}
              alt=""
              className="h-12 w-auto rounded border"
            />
          )}
          <Input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="max-w-xs"
            onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            disabled={!logoFile || logoMutation.isPending}
            onClick={() => logoFile && logoMutation.mutate({ data: { logo: logoFile } })}
          >
            {t('profile.logo_upload')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('profile.export_section')}</CardTitle>
          <CardDescription>{t('profile.export_hint')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            disabled={isExporting}
            onClick={() => void handleExport()}
          >
            {t('profile.export_action')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">{t('profile.danger_section')}</CardTitle>
          <CardDescription>{t('profile.danger_hint')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            className="text-destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            {t('profile.delete_action')}
          </Button>
        </CardContent>
      </Card>

      <DeleteAccountDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        hasPassword={user?.has_password ?? true}
        onConfirm={(body) => deleteMutation.mutate({ data: body })}
        isPending={deleteMutation.isPending}
      />
    </div>
  )
}

interface DeleteAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  hasPassword: boolean
  onConfirm: (body: { password?: string | null; confirmation?: string | null }) => void
  isPending: boolean
}

function DeleteAccountDialog({
  open,
  onOpenChange,
  hasPassword,
  onConfirm,
  isPending,
}: DeleteAccountDialogProps) {
  const { t } = useTranslation('settings')
  const { t: tCommon } = useTranslation()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')

  useEffect(() => {
    if (open) {
      setPassword('')
      setConfirmation('')
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('profile.delete_confirm_title')}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{t('profile.delete_confirm_description')}</p>
        <FieldGroup>
          {hasPassword ? (
            <Field>
              <FieldLabel htmlFor="delete-password">{t('profile.delete_password')}</FieldLabel>
              <Input
                id="delete-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
          ) : (
            <Field>
              <FieldLabel htmlFor="delete-confirmation">
                {t('profile.delete_confirmation')}
              </FieldLabel>
              <Input
                id="delete-confirmation"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                {t('profile.delete_confirmation_hint')}
              </p>
            </Field>
          )}
        </FieldGroup>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon('cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending || (hasPassword ? !password : confirmation !== 'DELETE')}
            onClick={() => onConfirm(hasPassword ? { password } : { confirmation })}
          >
            {t('profile.delete_action')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
