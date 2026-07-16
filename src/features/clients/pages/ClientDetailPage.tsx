import { PencilIcon, PlusIcon, TrashIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'

import { useDeleteClientsId, useGetClientsId } from '@/api/generated/clients/clients'
import {
  useDeleteClientsClientIdContactPersonsId,
  useGetClientsClientIdContactPersons,
} from '@/api/generated/contact-persons/contact-persons'
import type { ContactPerson } from '@/api/generated/qASAAPIDocumentation.schemas'
import { ContactPersonDialog } from '@/features/clients/components/ContactPersonDialog'
import { DateText } from '@/shared/components/DateText'
import { queryClient } from '@/shared/lib/query-client'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Skeleton } from '@/shared/ui/skeleton'

export function ClientDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation('clients')
  const { t: tCommon } = useTranslation()
  const [contactDialog, setContactDialog] = useState<{
    open: boolean
    contactPerson?: ContactPerson
  }>({
    open: false,
  })

  const client = useGetClientsId(id ?? '', { query: { enabled: Boolean(id) } })
  const contactPersons = useGetClientsClientIdContactPersons(id ?? '')

  const deleteClient = useDeleteClientsId({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: ['/api/v1/clients'] })
        toast.success(t('detail.deleted'))
        void navigate('/clients')
      },
    },
  })

  const deleteContactPerson = useDeleteClientsClientIdContactPersonsId({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: [`/api/v1/clients/${id}/contact-persons`],
        })
        toast.success(t('contact_persons.deleted'))
      },
    },
  })

  if (!id) {
    return <Navigate to="/clients" replace />
  }

  if (client.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!client.data) {
    return <Navigate to="/clients" replace />
  }

  const data = client.data

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{data.display_name}</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to={`/clients/${id}/edit`}>
              <PencilIcon />
              {tCommon('edit')}
            </Link>
          </Button>
          <Button
            variant="outline"
            className="text-destructive"
            onClick={() => {
              if (window.confirm(tCommon('confirm_delete'))) {
                deleteClient.mutate({ id })
              }
            }}
          >
            <TrashIcon />
            {tCommon('delete')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('detail.overview')}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <DetailRow label={t('form.client_type')}>
            {t(`client_type.${data.client_type}`)}
          </DetailRow>
          <DetailRow label={t('list.column_role')}>
            <div className="flex gap-1">
              {data.is_customer && <Badge variant="secondary">{t('role.customer')}</Badge>}
              {data.is_vendor && <Badge variant="outline">{t('role.vendor')}</Badge>}
            </div>
          </DetailRow>
          <DetailRow label={t('form.email')}>{data.email ?? '—'}</DetailRow>
          <DetailRow label={t('form.phone')}>{data.phone ?? '—'}</DetailRow>
          <DetailRow label={t('form.ico')}>{data.ico ?? '—'}</DetailRow>
          <DetailRow label={t('form.dic')}>{data.dic ?? '—'}</DetailRow>
          <DetailRow label={t('form.vat_id')}>
            {data.vat_id ?? '—'}
            {data.vat_verified_at && (
              <Badge variant="secondary" className="ml-2">
                {t('vies.previously_verified')}
              </Badge>
            )}
          </DetailRow>
          <DetailRow label={t('form.currency')}>{data.currency ?? '—'}</DetailRow>
          <DetailRow label={t('form.address')}>
            {[data.address, data.city, data.postal_code, data.country].filter(Boolean).join(', ') ||
              '—'}
          </DetailRow>
          <DetailRow label={t('list.column_created_at')}>
            <DateText value={data.created_at} />
          </DetailRow>
          {data.note && (
            <div className="col-span-2">
              <DetailRow label={t('form.note')}>{data.note}</DetailRow>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('contact_persons.title')}</CardTitle>
          <Button
            size="sm"
            onClick={() => setContactDialog({ open: true, contactPerson: undefined })}
          >
            <PlusIcon />
            {tCommon('add')}
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {contactPersons.isPending ? (
            <Skeleton className="h-16 w-full" />
          ) : !contactPersons.data?.length ? (
            <p className="text-sm text-muted-foreground">{t('contact_persons.empty')}</p>
          ) : (
            contactPersons.data.map((person) => (
              <div
                key={person.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex flex-col">
                  <span className="font-medium">
                    {person.full_name}
                    {person.is_primary && (
                      <Badge variant="secondary" className="ml-2">
                        {t('contact_persons.is_primary')}
                      </Badge>
                    )}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {[person.role, person.email, person.phone].filter(Boolean).join(' · ') || '—'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={tCommon('edit')}
                    onClick={() => setContactDialog({ open: true, contactPerson: person })}
                  >
                    <PencilIcon />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    aria-label={tCommon('delete')}
                    onClick={() => {
                      if (person.id && window.confirm(tCommon('confirm_delete'))) {
                        deleteContactPerson.mutate({ clientId: id, id: person.id })
                      }
                    }}
                  >
                    <TrashIcon />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <ContactPersonDialog
        clientId={id}
        contactPerson={contactDialog.contactPerson}
        open={contactDialog.open}
        onOpenChange={(open) => setContactDialog((state) => ({ ...state, open }))}
      />
    </div>
  )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="text-muted-foreground">{label}</span>
      <span>{children}</span>
    </div>
  )
}
