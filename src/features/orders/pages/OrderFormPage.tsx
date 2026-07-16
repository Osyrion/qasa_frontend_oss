import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'

import { useGetOrdersId, usePostOrders, usePutOrdersId } from '@/api/generated/orders/orders'
import {
  PostOrdersBodyBillingType,
  PostOrdersBodyCurrency,
  PostOrdersBodyStatus,
  type Order,
  type PostOrdersBody,
} from '@/api/generated/qASAAPIDocumentation.schemas'
import { ClientSelect } from '@/features/orders/components/ClientSelect'
import { isOrderEditable } from '@/features/orders/lib/order-status'
import { TextField } from '@/shared/components/TextField'
import { applyLaravelErrors } from '@/shared/lib/laravel-errors'
import { normalizeMoneyInput } from '@/shared/lib/money'
import { queryClient } from '@/shared/lib/query-client'
import { Button } from '@/shared/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Spinner } from '@/shared/ui/spinner'
import { Textarea } from '@/shared/ui/textarea'

const BILLING_TYPES = Object.values(PostOrdersBodyBillingType)
const CURRENCIES = Object.values(PostOrdersBodyCurrency).filter(
  (v): v is Exclude<typeof v, null> => v !== null,
)
const STATUSES = Object.values(PostOrdersBodyStatus)

interface OrderFormValues {
  name: string
  client_id: string
  billing_type: PostOrdersBodyBillingType
  color: string
  readme: string
  rate: string
  currency: string
  estimated_hours: string
  estimated_price: string
  deadline: string
  status: PostOrdersBodyStatus
}

function defaultValues(): OrderFormValues {
  return {
    name: '',
    client_id: '',
    billing_type: PostOrdersBodyBillingType.hourly,
    color: '#3B82F6',
    readme: '',
    rate: '',
    currency: '',
    estimated_hours: '',
    estimated_price: '',
    deadline: '',
    status: PostOrdersBodyStatus.active,
  }
}

function orderToFormValues(order: Order): OrderFormValues {
  return {
    name: order.name ?? '',
    client_id: order.client?.id ?? '',
    billing_type: (order.billing_type ??
      PostOrdersBodyBillingType.hourly) as PostOrdersBodyBillingType,
    color: order.color ?? '#3B82F6',
    readme: order.readme ?? '',
    rate: order.rate != null ? String(order.rate) : '',
    currency: order.currency ?? '',
    estimated_hours: order.estimated_hours != null ? String(order.estimated_hours) : '',
    estimated_price: order.estimated_price != null ? String(order.estimated_price) : '',
    deadline: order.deadline ?? '',
    status: (order.status ?? PostOrdersBodyStatus.active) as PostOrdersBodyStatus,
  }
}

export function OrderFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { t } = useTranslation('orders')
  const { t: tCommon } = useTranslation()

  const existing = useGetOrdersId(id ?? '', { query: { enabled: isEdit } })

  useEffect(() => {
    if (isEdit && existing.data && !isOrderEditable(existing.data.status ?? 'active')) {
      toast.error(t('form.not_editable'))
      void navigate(`/orders/${id}`, { replace: true })
    }
  }, [existing.data, id, isEdit, navigate, t])

  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, t('validation.name_required')).max(255),
        client_id: z.string(),
        billing_type: z.enum(BILLING_TYPES),
        color: z.string(),
        readme: z.string(),
        rate: z.string(),
        currency: z.string(),
        estimated_hours: z.string(),
        estimated_price: z.string(),
        deadline: z.string(),
        status: z.enum(STATUSES),
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
  } = useForm<OrderFormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(),
  })

  useEffect(() => {
    if (existing.data) {
      reset(orderToFormValues(existing.data))
    }
  }, [existing.data, reset])

  const toBody = (values: OrderFormValues): PostOrdersBody => ({
    name: values.name,
    billing_type: values.billing_type,
    client_id: values.client_id || null,
    color: values.color || null,
    readme: values.readme || null,
    rate: values.rate ? Number(normalizeMoneyInput(values.rate)) : null,
    currency: values.currency ? (values.currency as PostOrdersBodyCurrency) : null,
    estimated_hours: values.estimated_hours
      ? Number(normalizeMoneyInput(values.estimated_hours))
      : null,
    estimated_price: values.estimated_price
      ? Number(normalizeMoneyInput(values.estimated_price))
      : null,
    deadline: values.deadline || null,
    status: values.status,
  })

  const createMutation = usePostOrders({
    mutation: {
      onSuccess: (order) => {
        void queryClient.invalidateQueries({ queryKey: ['/api/v1/orders'] })
        toast.success(t('form.created'))
        void navigate(`/orders/${order.id}`)
      },
      onError: (error) => {
        const message = applyLaravelErrors(error, setError)
        if (message) toast.error(message)
      },
    },
  })

  const updateMutation = usePutOrdersId({
    mutation: {
      onSuccess: (order) => {
        void queryClient.invalidateQueries({ queryKey: ['/api/v1/orders'] })
        toast.success(t('form.updated'))
        void navigate(`/orders/${order.id}`)
      },
      onError: (error) => {
        const message = applyLaravelErrors(error, setError)
        if (message) toast.error(message)
      },
    },
  })

  const onSubmit: SubmitHandler<OrderFormValues> = (values) => {
    if (isEdit && id) {
      updateMutation.mutate({ id, data: toBody(values) })
    } else {
      createMutation.mutate({ data: toBody(values) })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  if (isEdit && existing.isPending) {
    return <Spinner />
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">
        {isEdit ? t('form.edit_title') : t('form.create_title')}
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <FieldGroup>
          <TextField id="name" label={t('form.name')} error={errors.name} {...register('name')} />

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="client_id">{t('form.client')}</FieldLabel>
              <ClientSelect
                id="client_id"
                value={watch('client_id')}
                onChange={(clientId) => setValue('client_id', clientId)}
                nullable
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="color">{t('form.color')}</FieldLabel>
              <Input id="color" type="color" className="h-9 w-full" {...register('color')} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="billing_type">{t('form.billing_type')}</FieldLabel>
              <Select
                value={watch('billing_type')}
                onValueChange={(value) =>
                  setValue('billing_type', value as PostOrdersBodyBillingType)
                }
              >
                <SelectTrigger id="billing_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BILLING_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`billing_type.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="status">{t('form.status')}</FieldLabel>
              <Select
                value={watch('status')}
                onValueChange={(value) => setValue('status', value as PostOrdersBodyStatus)}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {t(`status.${status}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <TextField id="rate" label={t('form.rate')} error={errors.rate} {...register('rate')} />
            <Field>
              <FieldLabel htmlFor="currency">{t('form.currency')}</FieldLabel>
              <Select
                value={watch('currency') || 'none'}
                onValueChange={(value) => setValue('currency', value === 'none' ? '' : value)}
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <TextField
              id="estimated_hours"
              label={t('form.estimated_hours')}
              error={errors.estimated_hours}
              {...register('estimated_hours')}
            />
            <TextField
              id="estimated_price"
              label={t('form.estimated_price')}
              error={errors.estimated_price}
              {...register('estimated_price')}
            />
          </div>

          <TextField
            id="deadline"
            type="date"
            label={t('form.deadline')}
            error={errors.deadline}
            {...register('deadline')}
          />

          <Field>
            <FieldLabel htmlFor="readme">{t('form.readme')}</FieldLabel>
            <Textarea id="readme" {...register('readme')} />
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
