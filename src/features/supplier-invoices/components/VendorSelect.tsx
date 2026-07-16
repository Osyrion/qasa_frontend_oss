import { useTranslation } from 'react-i18next'

import { useGetClients } from '@/api/generated/clients/clients'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

interface VendorSelectProps {
  id?: string
  value: string
  onChange: (clientId: string) => void
}

/** Vendor-role clients only — good enough at per_page=100 scale. */
export function VendorSelect({ id, value, onChange }: VendorSelectProps) {
  const { t } = useTranslation('supplierInvoices')
  const vendors = useGetClients({ per_page: 100, role: 'vendor' })

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id}>
        <SelectValue placeholder={t('form.vendor_placeholder')} />
      </SelectTrigger>
      <SelectContent>
        {vendors.data?.data?.map(
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
