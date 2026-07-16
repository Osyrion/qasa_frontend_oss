import axios, { AxiosError, type AxiosRequestConfig } from 'axios'

import { useAuthStore } from '@/features/auth/store'
import i18n from '@/shared/i18n'
import { hardRedirect } from '@/shared/lib/hard-redirect'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
})

apiClient.interceptors.request.use((config) => {
  const { token } = useAuthStore.getState()
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  config.headers.set('Accept', 'application/json')
  config.headers.set('Accept-Language', i18n.language || 'en')
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // 401 with a stored token = expired/revoked session; login failures are 422.
    if (error.response?.status === 401 && useAuthStore.getState().token) {
      useAuthStore.getState().clear()
      hardRedirect('/login?expired=1')
    }
    return Promise.reject(error)
  },
)

export const apiMutator = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> =>
  apiClient({
    ...config,
    ...options,
    headers: { ...config.headers, ...options?.headers },
  }).then((response) => response.data as T)

export default apiMutator

export type ErrorType<TError> = AxiosError<TError>
export type BodyType<TBody> = TBody
