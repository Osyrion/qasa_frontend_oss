import { useCallback } from 'react'
import { useNavigate } from 'react-router'

import type { PostAuthLogin200 } from '@/api/generated/qASAAPIDocumentation.schemas'
import { syncLocale } from '@/shared/i18n'

import { useAuthStore } from './store'

/**
 * Shared handling of POST auth/login and POST auth/google/callback responses:
 * either a full session, or a 2FA challenge that continues on /login/2fa.
 */
export function useAuthResponse(): (response: PostAuthLogin200) => void {
  const navigate = useNavigate()
  const setSession = useAuthStore((state) => state.setSession)
  const setChallengeToken = useAuthStore((state) => state.setChallengeToken)

  return useCallback(
    (response: PostAuthLogin200) => {
      if (response.two_factor_required && response.challenge_token) {
        setChallengeToken(response.challenge_token)
        void navigate('/login/2fa')
        return
      }
      if (response.token && response.user) {
        syncLocale(response.user.locale)
        setSession(response.token, response.user)
      }
    },
    [navigate, setSession, setChallengeToken],
  )
}
