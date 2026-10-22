import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = fileURLToPath(new URL('../../', import.meta.url))

function sources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return sources(path)
    return entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts') ? [path] : []
  })
}

describe('Pinia stores', () => {
  // Without it, a running `npm run dev` keeps an old store after a change while components get
  // the new code, so new actions are missing: the palette stopped responding this way.
  it('accept hot updates, so development sessions keep working after changes', () => {
    const missing = sources(join(root, 'src/renderer/src'))
      .filter((file) => readFileSync(file, 'utf8').includes('defineStore('))
      .filter((file) => !readFileSync(file, 'utf8').includes('acceptHMRUpdate('))
      .map((file) => relative(root, file))
    expect(missing).toEqual([])
  })
})
