import { isAxiosError } from 'axios'
import { LoaderCircleIcon, SearchIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { getClientsLookup } from '@/api/generated/clients/clients'
import { GetClientsLookupCountry } from '@/api/generated/qASAAPIDocumentation.schemas'
import type { LaravelErrorPayload } from '@/shared/lib/laravel-errors'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

/**
 * `GET /clients/lookup` documents no response schema (orval types it `void`);
 * this mirrors the backend's `CompanyRegistryData` DTO shape.
 */
export interface CompanyLookupResult {
  company_name: string | null
  ico: string | null
  dic: string | null
  vat_id: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  country: string
}

interface ClientLookupFieldProps {
  onFound: (result: CompanyLookupResult) => void
}

export function ClientLookupField({ onFound }: ClientLookupFieldProps) {
  const { t } = useTranslation('clients')
  const [country, setCountry] = useState<GetClientsLookupCountry>(GetClientsLookupCountry.SK)
  const [ico, setIco] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLookup = async () => {
    setError(null)
    setIsLoading(true)
    try {
      const response = await getClientsLookup({ country, ico })
      onFound(response as unknown as CompanyLookupResult)
    } catch (requestError) {
      const payload = isAxiosError(requestError)
        ? (requestError.response?.data as LaravelErrorPayload | null)
        : null
      setError(payload?.message ?? t('lookup.error'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex gap-2">
        <Select
          value={country}
          onValueChange={(value) => setCountry(value as GetClientsLookupCountry)}
        >
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={GetClientsLookupCountry.SK}>SK</SelectItem>
            <SelectItem value={GetClientsLookupCountry.CZ}>CZ</SelectItem>
          </SelectContent>
        </Select>
        <Input
          value={ico}
          onChange={(event) => setIco(event.target.value)}
          placeholder={t('lookup.ico_placeholder')}
          aria-label={t('lookup.ico_placeholder')}
          className="max-w-40"
        />
        <Button type="button" variant="outline" disabled={!ico || isLoading} onClick={handleLookup}>
          {isLoading ? <LoaderCircleIcon className="animate-spin" /> : <SearchIcon />}
          {t('lookup.action')}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
