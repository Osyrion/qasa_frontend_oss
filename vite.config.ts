/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

const CHARSET_META = '<meta charset="UTF-8" />'

/** The origin of a URL, or nothing at all if it is unset or unparseable. */
const originOf = (value: string | undefined): string[] => {
  if (!value) return []
  try {
    return [new URL(value).origin]
  } catch {
    return []
  }
}

/**
 * The session token lives in localStorage, which is the usual shape for a
 * Sanctum SPA and also means script injection would walk off with it. CSP is
 * what stands between those two facts, so the policy is deliberately narrow:
 * no inline script, no eval, no third-party origin at all.
 *
 * Build-only. Vite's dev server serves inline module preambles and needs eval
 * for HMR, so a policy strict enough to be worth having in production would
 * make `npm run dev` unusable — and a policy loose enough for dev is not worth
 * shipping.
 *
 * What each of the loosenings is for:
 * - `style-src 'unsafe-inline'`: radix-ui positions floating elements through
 *   inline style attributes, which style-src covers. Not reachable as a script
 *   sink on its own.
 * - `img-src data:`: the Pay-by-Square and TOTP QR codes arrive as data: URIs.
 * - `img-src`/`frame-src blob:`: PDF and inbox previews are fetched with the
 *   bearer token and handed to <iframe>/<img> as object URLs.
 * - the API origin in `img-src`: the account logo is served off `/storage/`
 *   there, not from this bundle.
 *
 * `frame-ancestors` is missing on purpose — browsers ignore it in a meta tag.
 * It has to be a real response header, along with Referrer-Policy and HSTS,
 * from whatever serves `dist/`; this covers what a static bundle can cover by
 * itself, not what the webserver still owes.
 */
function contentSecurityPolicy(apiUrl: string | undefined): Plugin {
  const api = originOf(apiUrl)

  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    `img-src ${["'self'", 'data:', 'blob:', ...api].join(' ')}`,
    "font-src 'self' data:",
    `connect-src ${["'self'", ...api].join(' ')}`,
    "frame-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')

  return {
    name: 'qasa-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      // After the charset declaration, not before it: that one has to land
      // inside the document's first 1024 bytes, and this tag is not small.
      handler: (html) => {
        const anchor = html.includes(CHARSET_META) ? CHARSET_META : '<head>'
        return html.replace(
          anchor,
          `${anchor}\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`,
        )
      },
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    // `.env` files are not on process.env unless something exported them, and
    // the policy needs the same API origin the client was built against.
    contentSecurityPolicy(loadEnv(mode, import.meta.dirname, 'VITE_').VITE_API_URL),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  server: {
    port: 3000,
  },
  test: {
    // tests/ holds checks that read the repository itself (edition boundary);
    // src/ holds the component tests.
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/**/*.{test,spec}.ts'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test/setup.ts'],
    restoreMocks: true,
    // The companion to setup.ts's `asyncUtilTimeout: 5000`, which claims to
    // sit "far below testTimeout" — it did not. Vitest's default is 5000 too,
    // so a findBy* that legitimately needed most of its budget lost the race
    // to the test timeout instead of failing on its own merits, and the suite
    // failed a different handful of files on every run depending on how busy
    // the machine was. A real hang still fails well within this.
    testTimeout: 15000,
  },
}))
