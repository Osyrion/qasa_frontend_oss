import { isAxiosError } from 'axios'
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'

export interface LaravelErrorPayload {
  message?: string
  errors?: Record<string, string[]>
}

/**
 * Maps a Laravel 422 validation error bag onto react-hook-form field errors.
 * Laravel dot-notation keys (`items.0.unit_price`) are valid RHF paths as-is.
 *
 * Returns a message for the caller to toast when there is no errors bag
 * (domain exception), or null when field errors were applied / the error
 * is not an HTTP error response.
 */
export function applyLaravelErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): string | null {
  if (!isAxiosError(error) || !error.response) {
    return null
  }

  const payload = error.response.data as LaravelErrorPayload | null
  const errors = payload?.errors

  if (errors && Object.keys(errors).length > 0) {
    for (const [field, messages] of Object.entries(errors)) {
      if (messages[0] !== undefined) {
        setError(field as Path<T>, { type: 'server', message: messages[0] })
      }
    }
    return null
  }

  return payload?.message ?? null
}
