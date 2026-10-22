import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = fileURLToPath(new URL('../../', import.meta.url))

function sources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return sources(path)
    return /\.(ts|vue)$/u.test(entry.name) && !entry.name.endsWith('.test.ts') ? [path] : []
  })
}

/** The only modules allowed to name the old shell's keys: the one-time migrations (W6). */
const MIGRATIONS = [
  'src/renderer/src/workbench/model/derive-from-legacy.ts',
  'src/renderer/src/workbench/storage/workbench-storage.ts',
  'src/renderer/src/app/legacy-last-entry.ts'
]

describe('retired storage keys', () => {
  // The classic shell's keys are read once to migrate, then removed; nothing else may keep using them.
  it('are named only by their one-time migrations', () => {
    const naming = sources(join(root, 'src/renderer/src'))
      .filter((file) => /plotdevice\.(layout|lastEntry)\b/u.test(readFileSync(file, 'utf8')))
      .map((file) => relative(root, file).split('\\').join('/'))
      .sort()
    expect(naming).toEqual([...MIGRATIONS].sort())
  })
})
