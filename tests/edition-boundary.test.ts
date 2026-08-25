import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * The backend enforces its edition boundary with a generator and a test
 * (`scripts/build-oss.sh` + `EditionBoundaryTest`). This repository has
 * neither — it is maintained by hand against a private SaaS sibling — so
 * nothing stopped two things from drifting into a public repo:
 *
 *   - `taxReturn.json` told the reader the tax return wizard "is included in
 *     the Pro plan". There is no Pro plan here. The feature middleware is
 *     aliased to AllowAllFeatures in the open-source build, so the 403 that
 *     copy answers never arrives, and naming a commercial tier in a public
 *     repository publishes the price list a little.
 *   - a docblock named the private backend repository.
 *
 * This is the smallest thing that would have caught both. It is a text scan,
 * not an architecture check: it cannot tell whether a *feature* is premium,
 * only whether the words that describe the commercial edition have appeared.
 * Extend the lists rather than allowlisting a file — a hit is either a real
 * leak or a word that needs a less ambiguous synonym.
 */

/** Names that only exist in the commercial edition. */
const FORBIDDEN_TERMS = [
  'flok_backend',
  'flok_frontend',
  'flok-web',
  'Pro plan',
  'plánu Pro',
  'plán Pro',
]

/** Premium modules — the same list scripts/build-oss.sh deletes. */
const PREMIUM_MODULES = ['payment-orders', 'time-tracking', 'beta-waitlist']

// Lives outside src/ on purpose: this reads the filesystem, and src/ is
// compiled by tsconfig.app.json, which has no Node types. fileURLToPath
// rather than import.meta.dirname — the latter is undefined in some of
// vitest's pools.
const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src')

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry: string): string[] => {
    const full = path.join(dir, entry)

    // Generated from the OSS backend's own spec: whatever is in there is
    // already public API, and rewriting it would be undone by the next sync.
    if (entry === 'generated') return []

    if (statSync(full).isDirectory()) return sourceFiles(full)

    return /\.(ts|tsx|json)$/.test(entry) ? [full] : []
  })
}

describe('edition boundary', () => {
  const files = sourceFiles(SRC).filter((f) => !f.endsWith('edition-boundary.test.ts'))

  it('names nothing that only exists in the commercial edition', () => {
    const hits: string[] = []

    for (const file of files) {
      const contents = readFileSync(file, 'utf8')

      for (const term of FORBIDDEN_TERMS) {
        if (contents.includes(term)) {
          hits.push(`${path.relative(SRC, file)} → "${term}"`)
        }
      }
    }

    expect(hits, `Commercial-edition terms in a public repository: ${hits.join(', ')}`).toEqual([])
  })

  it('ships no feature directory the open-source backend has no endpoints for', () => {
    const features = readdirSync(path.join(SRC, 'features'))
    const premium = features.filter((f: string) => PREMIUM_MODULES.includes(f))

    expect(premium, `Premium feature directories: ${premium.join(', ')}`).toEqual([])
  })
})
