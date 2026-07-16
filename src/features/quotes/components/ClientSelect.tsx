import { useTranslation } from 'react-i18next'

import { useGetClients } from '@/api/generated/clients/clients'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

interface ClientSelectProps {
  id?: string
  value: string
  onChange: (clientId: string) => void
}

/** Simple select over the caller's own client list — good enough at per_page=100 scale. */
export function ClientSelect({ id, value, onChange }: ClientSelectProps) {
  const { t } = useTranslation('quotes')
  const clients = useGetClients({ per_page: 100 })

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id}>
        <SelectValue placeholder={t('form.client_placeholder')} />
      </SelectTrigger>
      <SelectContent>
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
