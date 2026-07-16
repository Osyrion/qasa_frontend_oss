import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { User } from '@/api/generated/qASAAPIDocumentation.schemas'

interface AuthState {
  token: string | null
  user: User | null
  /** 2FA login challenge — deliberately not persisted (memory only). */
  challengeToken: string | null
  setSession: (token: string, user: User) => void
  setUser: (user: User) => void
  setChallengeToken: (challengeToken: string | null) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      challengeToken: null,
      setSession: (token, user) => set({ token, user, challengeToken: null }),
      setUser: (user) => set({ user }),
      setChallengeToken: (challengeToken) => set({ challengeToken }),
      clear: () => set({ token: null, user: null, challengeToken: null }),
    }),
    {
      name: 'qasa-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    },
  ),
)
