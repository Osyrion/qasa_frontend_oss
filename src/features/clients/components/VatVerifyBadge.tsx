import { isAxiosError } from 'axios'
import { LoaderCircleIcon, ShieldCheckIcon } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { getClientsVerifyVat } from '@/api/generated/clients/clients'
import type { LaravelErrorPayload } from '@/shared/lib/laravel-errors'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'

/** Mirrors the backend's `VatValidationData` DTO — `verify-vat` documents no response schema. */
export interface VatValidationResult {
  valid: boolean
  country: string
  vat_number: string
  name: string | null
  address: string | null
}

interface VatVerifyBadgeProps {
  country: string
  vatId: string
  clientId?: string
  wasVerified?: boolean
  onVerified?: () => void
}

export function VatVerifyBadge({
  country,
  vatId,
  clientId,
  wasVerified,
  onVerified,
}: VatVerifyBadgeProps) {
  const { t } = useTranslation('clients')
  const [state, setState] = useState<'idle' | 'loading' | 'valid' | 'invalid' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)

  const handleVerify = async () => {
    setState('loading')
    setMessage(null)
    try {
      const response = await getClientsVerifyVat({ country, vat_id: vatId, client_id: clientId })
      const result = response as unknown as VatValidationResult
      setState(result.valid ? 'valid' : 'invalid')
      if (result.valid) {
        onVerified?.()
      }
    } catch (requestError) {
      const payload = isAxiosError(requestError)
        ? (requestError.response?.data as LaravelErrorPayload | null)
        : null
      setState('error')
      setMessage(payload?.message ?? t('vies.error'))
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!vatId || state === 'loading'}
        onClick={() => void handleVerify()}
      >
        {state === 'loading' ? <LoaderCircleIcon className="animate-spin" /> : <ShieldCheckIcon />}
        {t('vies.verify')}
      </Button>
      {state === 'valid' && <Badge variant="secondary">{t('vies.valid')}</Badge>}
      {state === 'invalid' && <Badge variant="destructive">{t('vies.invalid')}</Badge>}
      {state === 'error' && <span className="text-sm text-destructive">{message}</span>}
      {state === 'idle' && wasVerified && (
        <Badge variant="outline">{t('vies.previously_verified')}</Badge>
      )}
    </div>
  )
}
