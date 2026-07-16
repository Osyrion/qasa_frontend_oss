import { useTranslation } from 'react-i18next'

import { Field, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

export type PeriodGranularity = 'year' | 'quarter' | 'month'

export interface PeriodValue {
  year: number
  granularity: PeriodGranularity
  quarter?: number
  month?: number
}

interface PeriodPickerProps {
  value: PeriodValue
  onChange: (value: PeriodValue) => void
  /** When true, "whole year" is not offered — a quarter or month is required. */
  requirePeriod?: boolean
}

const QUARTERS = [1, 2, 3, 4]
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

export function PeriodPicker({ value, onChange, requirePeriod = false }: PeriodPickerProps) {
  const { t } = useTranslation('reports')

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Field className="w-28">
        <FieldLabel>{t('period.year')}</FieldLabel>
        <Input
          type="number"
          value={value.year}
          onChange={(event) => onChange({ ...value, year: Number(event.target.value) })}
        />
      </Field>

      <Field className="w-40">
        <FieldLabel>{t('period.granularity')}</FieldLabel>
        <Select
          value={value.granularity}
          onValueChange={(granularity) =>
            onChange({
              year: value.year,
              granularity: granularity as PeriodGranularity,
              quarter: granularity === 'quarter' ? (value.quarter ?? 1) : undefined,
              month: granularity === 'month' ? (value.month ?? 1) : undefined,
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {!requirePeriod && <SelectItem value="year">{t('period.whole_year')}</SelectItem>}
            <SelectItem value="quarter">{t('period.quarter')}</SelectItem>
            <SelectItem value="month">{t('period.month')}</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      {value.granularity === 'quarter' && (
        <Field className="w-28">
          <FieldLabel>{t('period.quarter')}</FieldLabel>
          <Select
            value={String(value.quarter ?? 1)}
            onValueChange={(quarter) => onChange({ ...value, quarter: Number(quarter) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUARTERS.map((quarter) => (
                <SelectItem key={quarter} value={String(quarter)}>
                  Q{quarter}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      {value.granularity === 'month' && (
        <Field className="w-28">
          <FieldLabel>{t('period.month')}</FieldLabel>
          <Select
            value={String(value.month ?? 1)}
            onValueChange={(month) => onChange({ ...value, month: Number(month) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month) => (
                <SelectItem key={month} value={String(month)}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
    </div>
  )
}
