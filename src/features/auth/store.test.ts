import { useAuthStore } from './store'

describe('auth store', () => {
  it('persists token and user but not the 2FA challenge token', () => {
    useAuthStore.getState().setSession('token-123', { id: 1, name: 'Test', email: 't@t.sk' })
    useAuthStore.getState().setChallengeToken('challenge-abc')

    const persisted = JSON.parse(localStorage.getItem('qasa-auth') ?? '{}') as {
      state?: Record<string, unknown>
    }

    expect(persisted.state?.token).toBe('token-123')
    expect(persisted.state).not.toHaveProperty('challengeToken')
  })

  it('clear() wipes the whole session', () => {
    useAuthStore.getState().setSession('token-123', { id: 1, name: 'Test', email: 't@t.sk' })
    useAuthStore.getState().clear()

    expect(useAuthStore.getState().token).toBeNull()
    expect(useAuthStore.getState().user).toBeNull()
  })
})
