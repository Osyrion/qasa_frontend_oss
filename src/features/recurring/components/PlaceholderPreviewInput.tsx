import { useTranslation } from 'react-i18next'

import { resolvePlaceholders } from '@/features/recurring/lib/placeholders'
import { Field, FieldLabel } from '@/shared/ui/field'
import { Textarea } from '@/shared/ui/textarea'

interface PlaceholderPreviewInputProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  /** Used to resolve the {BOM}/{EOM}/{MONTH}/{YEAR} preview — defaults to today. */
  referenceDate?: Date
}

export function PlaceholderPreviewInput({
  id,
  label,
  value,
  onChange,
  referenceDate,
}: PlaceholderPreviewInputProps) {
  const { t } = useTranslation('recurring')
  const preview = resolvePlaceholders(value, referenceDate)

  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} />
      {value && preview !== value && (
        <p className="text-xs text-muted-foreground">
          {t('placeholders.preview')}: {preview}
        </p>
      )}
    </Field>
  )
}
