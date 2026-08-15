import { setupServer } from 'msw/node'

import {
  getAuthenticationMock,
  getGetAuthMeMockHandler,
} from '@/api/generated/authentication/authentication.msw'
import { getTwoFactorMock } from '@/api/generated/two-factor/two-factor.msw'

/**
 * Orval-generated handlers are the defaults; individual tests override
 * specific endpoints with `server.use(...)` for error cases.
 *
 * GET auth/me defaults to a fully onboarded user (tax residency set) since
 * that's what nearly every test fixture assumes — RequireResidency redirects
 * to /onboarding/residency otherwise. Tests exercising onboarding itself, or
 * asserting on specific user fields, override with `server.use(...)`.
 */
export const server = setupServer(
  getGetAuthMeMockHandler({ data: { has_tax_residency: true, country: 'SK' } }),
  ...getAuthenticationMock(),
  ...getTwoFactorMock(),
)
