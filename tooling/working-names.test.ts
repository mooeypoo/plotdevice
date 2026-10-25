import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Working names must stay cheap to replace (owner decision, 2026-10-25): the visible word lives only in
 * the message catalogs, and code uses fixed internal IDs (`story`). This fails if interface code
 * spells the word itself, so a rename stays a two-line change in `en.json` and `he.json`.
 */
const WORKING_NAMES = [/\bStory\b/, /סיפור/]
const ROOTS = ['packages/ui-vue/src', 'packages/presentation/src', 'apps/desktop/src']
const repository = join(import.meta.dirname, '..')

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.(vue|ts)$/.test(entry.name) && !/\.test\.ts$/.test(entry.name) ? [path] : []
  })
}

const withoutComments = (code: string): string =>
  code
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/.*$/gm, '$1')

describe('working names', () => {
  const files = ROOTS.flatMap((root) => sourceFiles(join(repository, root)))

  it('scans the interface code', () => {
    expect(files.length).toBeGreaterThan(10)
  })

  it.each(files.map((file) => [relative(repository, file), file]))('%s spells no working name itself', (_name, file) => {
    const code = withoutComments(readFileSync(file, 'utf8'))
    expect(WORKING_NAMES.filter((pattern) => pattern.test(code)).map(String)).toEqual([])
  })

  it('catches a hard-coded name (the check itself works)', () => {
    expect(WORKING_NAMES.some((pattern) => pattern.test(withoutComments('<button>Story</button>')))).toBe(true)
    expect(WORKING_NAMES.some((pattern) => pattern.test(withoutComments("// the Story workspace\nconst id = 'story'")))).toBe(false)
  })
})
