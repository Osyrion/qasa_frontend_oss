import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'

import {
  usePostClientsClientIdContactPersons,
  usePutClientsClientIdContactPersonsId,
} from '@/api/generated/contact-persons/contact-persons'
import type { ContactPerson } from '@/api/generated/qASAAPIDocumentation.schemas'
import { queryClient } from '@/shared/lib/query-client'
import { TextField } from '@/shared/components/TextField'
import { applyLaravelErrors } from '@/shared/lib/laravel-errors'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/shared/ui/field'

const schema = z.object({
  title: z.string().max(100),
  name: z.string().min(1).max(150),
  surname: z.string().min(1).max(150),
  email: z.string().max(255),
  phone: z.string().max(30),
  role: z.string().max(100),
  is_primary: z.boolean(),
})

type ContactPersonFormValues = z.infer<typeof schema>

const EMPTY_VALUES: ContactPersonFormValues = {
  title: '',
  name: '',
  surname: '',
  email: '',
  phone: '',
  role: '',
  is_primary: false,
}

function toFormValues(contactPerson: ContactPerson): ContactPersonFormValues {
  return {
    title: contactPerson.title ?? '',
    name: contactPerson.name ?? '',
    surname: contactPerson.surname ?? '',
    email: contactPerson.email ?? '',
    phone: contactPerson.phone ?? '',
    role: contactPerson.role ?? '',
    is_primary: contactPerson.is_primary ?? false,
  }
}

interface ContactPersonDialogProps {
  clientId: string
  contactPerson?: ContactPerson
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ContactPersonDialog({
  clientId,
  contactPerson,
  open,
  onOpenChange,
}: ContactPersonDialogProps) {
  const { t } = useTranslation('clients')
  const { t: tCommon } = useTranslation()
  const isEdit = Boolean(contactPerson)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    reset,
    formState: { errors },
  } = useForm<ContactPersonFormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY_VALUES,
  })

  useEffect(() => {
    if (open) {
      reset(contactPerson ? toFormValues(contactPerson) : EMPTY_VALUES)
    }
  }, [open, contactPerson, reset])

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: [`/api/v1/clients/${clientId}/contact-persons`],
    })

  const createMutation = usePostClientsClientIdContactPersons({
    mutation: {
      onSuccess: () => {
        void invalidate()
        toast.success(t('contact_persons.created'))
        onOpenChange(false)
      },
      onError: (error) => {
        const message = applyLaravelErrors(error, setError)
        if (message) toast.error(message)
      },
    },
  })

  const updateMutation = usePutClientsClientIdContactPersonsId({
    mutation: {
      onSuccess: () => {
        void invalidate()
        toast.success(t('contact_persons.updated'))
        onOpenChange(false)
      },
      onError: (error) => {
        const message = applyLaravelErrors(error, setError)
        if (message) toast.error(message)
      },
    },
  })

  const onSubmit: SubmitHandler<ContactPersonFormValues> = (values) => {
    const orNull = (value: string) => (value.trim() ? value.trim() : null)
    const data = {
      title: orNull(values.title),
      name: values.name.trim(),
      surname: values.surname.trim(),
      email: orNull(values.email),
      phone: orNull(values.phone),
      role: orNull(values.role),
      is_primary: values.is_primary,
    }
    if (isEdit && contactPerson?.id) {
      updateMutation.mutate({ clientId, id: contactPerson.id, data })
    } else {
      createMutation.mutate({ clientId, data })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? t('contact_persons.edit_title') : t('contact_persons.add_title')}
            </DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <div className="grid grid-cols-2 gap-3">
              <TextField
                id="cp_name"
                label={t('form.name')}
                error={errors.name}
                {...register('name')}
              />
              <TextField
                id="cp_surname"
                label={t('form.surname')}
                error={errors.surname}
                {...register('surname')}
              />
            </div>
            <TextField
              id="cp_title"
              label={t('form.title')}
              error={errors.title}
              {...register('title')}
            />
            <TextField
              id="cp_role"
              label={t('contact_persons.role')}
              error={errors.role}
              {...register('role')}
            />
            <TextField
              id="cp_email"
              type="email"
              label={t('form.email')}
              error={errors.email}
              {...register('email')}
            />
            <TextField
              id="cp_phone"
              label={t('form.phone')}
              error={errors.phone}
              {...register('phone')}
            />
            <Field orientation="horizontal">
              <Checkbox
                id="cp_is_primary"
                checked={watch('is_primary')}
                onCheckedChange={(checked) => setValue('is_primary', checked === true)}
              />
              <FieldLabel htmlFor="cp_is_primary">{t('contact_persons.is_primary')}</FieldLabel>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon('cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {tCommon('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
