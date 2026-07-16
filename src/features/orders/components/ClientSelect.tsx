import { useTranslation } from 'react-i18next'

import { useGetClients } from '@/api/generated/clients/clients'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

interface ClientSelectProps {
  id?: string
  /** Empty string means "no client" (personal order). */
  value: string
  onChange: (clientId: string) => void
  nullable?: boolean
}

/** Simple select over the caller's own client list — good enough at per_page=100 scale. */
export function ClientSelect({ id, value, onChange, nullable = false }: ClientSelectProps) {
  const { t } = useTranslation('orders')
  const clients = useGetClients({ per_page: 100 })

  return (
    <Select
      value={value || (nullable ? 'none' : '')}
      onValueChange={(next) => onChange(next === 'none' ? '' : next)}
    >
      <SelectTrigger id={id}>
        <SelectValue placeholder={t('form.client_placeholder')} />
      </SelectTrigger>
      <SelectContent>
        {nullable && <SelectItem value="none">{t('form.client_none')}</SelectItem>}
        {clients.data?.data?.map(
          (client) =>
            client.id && (
              <SelectItem key={client.id} value={client.id}>
                {client.display_name}
              </SelectItem>
            ),
        )}
      </SelectContent>
    </Select>
  )
}
