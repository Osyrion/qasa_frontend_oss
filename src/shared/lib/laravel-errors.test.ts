import { AxiosError, type AxiosResponse } from 'axios'
import type { UseFormSetError } from 'react-hook-form'

import { applyLaravelErrors, type LaravelErrorPayload } from './laravel-errors'

function makeAxios422(payload: LaravelErrorPayload): AxiosError {
  return new AxiosError('Unprocessable', 'ERR_BAD_REQUEST', undefined, undefined, {
    status: 422,
    data: payload,
  } as AxiosResponse)
}

describe('applyLaravelErrors', () => {
  it('maps the errors bag onto RHF fields, including nested dot-notation paths', () => {
    const setError = vi.fn()
    const error = makeAxios422({
      message: 'Invalid.',
      errors: {
        email: ['Email is taken.', 'Second message ignored.'],
        'items.0.unit_price': ['Must be positive.'],
      },
    })

    const message = applyLaravelErrors(error, setError as unknown as UseFormSetError<never>)

    expect(message).toBeNull()
    expect(setError).toHaveBeenCalledTimes(2)
    expect(setError).toHaveBeenCalledWith('email', { type: 'server', message: 'Email is taken.' })
    expect(setError).toHaveBeenCalledWith('items.0.unit_price', {
      type: 'server',
      message: 'Must be positive.',
    })
  })

  it('returns the message for toasting when there is no errors bag (domain exception)', () => {
    const setError = vi.fn()
    const error = makeAxios422({ message: 'Invoice is already paid.' })

    const message = applyLaravelErrors(error, setError as unknown as UseFormSetError<never>)

    expect(message).toBe('Invoice is already paid.')
    expect(setError).not.toHaveBeenCalled()
  })

  it('returns null for network errors and non-axios errors', () => {
    const setError = vi.fn()

    expect(
      applyLaravelErrors(new Error('boom'), setError as unknown as UseFormSetError<never>),
    ).toBeNull()
    expect(
      applyLaravelErrors(
        new AxiosError('Network Error', 'ERR_NETWORK'),
        setError as unknown as UseFormSetError<never>,
      ),
    ).toBeNull()
    expect(setError).not.toHaveBeenCalled()
  })
})
