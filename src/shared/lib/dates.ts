import { parse } from 'date-fns'

const TIME_ZONE = 'Europe/Bratislava'

/** Parses a date-only Laravel field (`yyyy-MM-dd`) — never `new Date(s)`, which UTC-shifts. */
export function parseDateOnly(value: string): Date {
  return parse(value, 'yyyy-MM-dd', new Date())
}

export function formatDateOnly(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { timeZone: TIME_ZONE }).format(parseDateOnly(value))
}

export function formatDateTime(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: TIME_ZONE,
  }).format(new Date(value))
}
