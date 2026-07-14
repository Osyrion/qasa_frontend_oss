import { defineConfig } from 'orval'

/**
 * Spec operationIds are md5 hashes, so operation names are derived
 * from the HTTP verb + route instead:
 *   GET  /api/v1/clients                  -> getClients
 *   POST /api/v1/invoices/{invoice}/email -> postInvoicesInvoiceEmail
 */
function operationNameFromRoute(route: string, verb: string): string {
  const segments = route
    .replace(/^\/?api\/v1\//, '')
    .split('/')
    .map((segment) => segment.replace(/[{}$]/g, ''))
    .filter(Boolean)
    .flatMap((segment) => segment.split(/[-_.]/))
    .filter(Boolean)

  const pascal = segments
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('')

  return verb.toLowerCase() + pascal
}

export default defineConfig({
  qasa: {
    input: {
      target: './openapi/api-docs.json',
      // The backend spec has minor validation nits (e.g. a path parameter
      // declared in the URL but not defined) — generate anyway.
      validation: false,
      parserOptions: {
        validate: {
          schema: false,
          spec: false,
        },
      },
    },
    output: {
      mode: 'tags-split',
      target: './src/api/generated',
      client: 'react-query',
      httpClient: 'axios',
      mock: true,
      clean: true,
      prettier: false,
      override: {
        mutator: {
          path: './src/api/mutator.ts',
          name: 'apiMutator',
        },
        operationName: (_operation, route, verb) => operationNameFromRoute(route, verb),
      },
    },
  },
})
