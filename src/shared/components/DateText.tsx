import { useTranslation } from 'react-i18next'

import { formatDateOnly, formatDateTime } from '@/shared/lib/dates'

interface DateTextProps {
  value?: string | null
  /** `date-only` for fields like `issued_at`/`due_at`, `datetime` for timestamps. */
  variant?: 'date-only' | 'datetime'
}

export function DateText({ value, variant = 'datetime' }: DateTextProps) {
  const { i18n } = useTranslation()

  if (!value) {
    return <span className="text-muted-foreground">—</span>
  }

  const formatted =
    variant === 'date-only'
      ? formatDateOnly(value, i18n.language)
      : formatDateTime(value, i18n.language)

  return <time dateTime={value}>{formatted}</time>
}
