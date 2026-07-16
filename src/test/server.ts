import { setupServer } from 'msw/node'

import { getAuthenticationMock } from '@/api/generated/authentication/authentication.msw'
import { getTwoFactorMock } from '@/api/generated/two-factor/two-factor.msw'

/**
 * Orval-generated handlers are the defaults; individual tests override
 * specific endpoints with `server.use(...)` for error cases.
 */
export const server = setupServer(...getAuthenticationMock(), ...getTwoFactorMock())
