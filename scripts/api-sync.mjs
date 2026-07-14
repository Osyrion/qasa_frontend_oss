#!/usr/bin/env node
/**
 * Syncs the OpenAPI spec from the qasa_core backend and regenerates the API client.
 *
 * Source order:
 *   1. sibling checkout  ../qasa_core/storage/api-docs/api-docs.json
 *   2. running backend   ${QASA_API_URL:-http://localhost:8000}/docs/api-docs.json
 */
import { copyFile, writeFile, readFile, access } from 'node:fs/promises'
import { execSync } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'

const root = path.resolve(import.meta.dirname, '..')
const target = path.join(root, 'openapi', 'api-docs.json')
const siblingSpec = path.resolve(root, '..', 'qasa_core', 'storage', 'api-docs', 'api-docs.json')
const backendUrl = process.env.QASA_API_URL ?? 'http://localhost:8000'

async function fetchSpec() {
  try {
    await access(siblingSpec)
    await copyFile(siblingSpec, target)
    console.log(`Spec copied from ${siblingSpec}`)
    return
  } catch {
    // sibling checkout not available, fall through to HTTP
  }

  const url = `${backendUrl}/docs/api-docs.json`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch spec from ${url}: HTTP ${response.status}`)
  }
  const spec = await response.json()
  await writeFile(target, JSON.stringify(spec, null, 4) + '\n')
  console.log(`Spec fetched from ${url}`)
}

/**
 * Some backend endpoints declare `{param}` in the URL without a matching
 * OpenAPI parameter definition (orval refuses to generate those). Inject
 * the missing path parameters derived from the route template.
 */
async function normalizeSpec() {
  const spec = JSON.parse(await readFile(target, 'utf8'))
  const httpVerbs = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head'])
  let injected = 0

  for (const [route, pathItem] of Object.entries(spec.paths ?? {})) {
    const templateParams = [...route.matchAll(/\{([^}]+)\}/g)].map((match) => match[1])
    if (templateParams.length === 0) continue

    for (const [verb, operation] of Object.entries(pathItem)) {
      if (!httpVerbs.has(verb)) continue
      operation.parameters ??= []
      const defined = new Set(
        [...operation.parameters, ...(pathItem.parameters ?? [])]
          .filter((parameter) => parameter.in === 'path')
          .map((parameter) => parameter.name),
      )
      for (const name of templateParams) {
        if (defined.has(name)) continue
        operation.parameters.push({
          name,
          in: 'path',
          required: true,
          schema: { type: 'string' },
        })
        injected += 1
      }
    }
  }

  if (injected > 0) {
    await writeFile(target, JSON.stringify(spec, null, 4) + '\n')
    console.log(`Normalized spec: injected ${injected} missing path parameter(s)`)
  }
}

await fetchSpec()
await normalizeSpec()
execSync('npx orval --config orval.config.ts', { cwd: root, stdio: 'inherit' })
