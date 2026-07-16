import { useTranslation } from 'react-i18next'

import { formatMoney } from '@/shared/lib/money'

interface MoneyTextProps {
  amount?: number | null
  currency: string
}

export function MoneyText({ amount, currency }: MoneyTextProps) {
  const { i18n } = useTranslation()

  if (amount === null || amount === undefined) {
    return <span className="text-muted-foreground">—</span>
  }

  return <span>{formatMoney(amount, currency, i18n.language)}</span>
}
