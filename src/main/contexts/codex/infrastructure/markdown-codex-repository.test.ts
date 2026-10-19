import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ProjectPath } from '../../../shared-kernel/project-path'
import { copySampleNovel, type SampleNovelCopy } from '../../../infrastructure/testing/sample-novel'
import { createCreateCodexEntry } from '../application/commands/create-codex-entry'
import { createSetEntryType } from '../application/commands/set-entry-type'
import { createUpdateCodexProperties } from '../application/commands/update-codex-properties'
import { createGetCodexProperties } from '../application/queries/get-codex-properties'
import { createListCodex } from '../application/queries/list-codex'
import type { CodexSettings } from '../domain/codex-settings'
import { createMarkdownCodexRepository } from './markdown-codex-repository'

let copy: SampleNovelCopy
const p = (value: string): ProjectPath => value as ProjectPath
const text = (path: string): Promise<string> =>
  readFile(join(copy.root, ...path.split('/')), 'utf8')
const settings: CodexSettings = {
  readOnly: false,
  folders: { character: p('characters'), location: p('locations'), note: p('notes') },
  fileNames: 'ask'
}

beforeEach(async () => {
  copy = await copySampleNovel()
})

afterEach(async () => {
  await copy.remove()
})

describe('the sample novel’s codex', () => {
  it('lists characters, locations, notes, and readable untyped files', async () => {
    const listing = await createListCodex({
      repository: createMarkdownCodexRepository(copy.root)
    })()
    expect(listing.entries.map((entry) => `${entry.kind}:${entry.title}`)).toEqual([
      'character:Aunt Bea',
      'note:Chapter #3 [draft]',
      'character:Ilka Szabó',
      'character:Marrow',
      'location:Marrow',
      'character:Noël',
      'note:Research',
      'character:יעל'
    ])
    const untyped = listing.untyped.map((file) => file.path)
    expect(untyped).toContain('Loose thoughts.md')
    expect(untyped).not.toContain('manuscript/Part Two/Broken.md')
    expect(listing.untyped).toContainEqual({ path: 'notes/Unknown type.md', rawType: 'spaceship' })
  })

  it('edits only the changed keys, keeping relationships and comments', async () => {
    const repository = createMarkdownCodexRepository(copy.root)
    const path = p('characters/Ilka Szabó.md')
    const before = await text(path)
    const read = await createGetCodexProperties({ repository })(path)
    if (!read.ok) throw new Error('expected properties')
    expect(read.value.properties.relationships).toHaveLength(2)

    await createUpdateCodexProperties({ repository, settings })(path, read.value.version, {
      role: 'narrator'
    })
    expect(await text(path)).toBe(before.replace('role: protagonist', 'role: narrator'))
  })

  it('creates a character from the template, and types an untyped file', async () => {
    const repository = createMarkdownCodexRepository(copy.root)
    await createCreateCodexEntry({ repository, settings })('character', 'Marta Kovač')
    expect(await text('characters/Marta Kovač.md')).toBe(
      '---\ntype: character\ntitle: "Marta Kovač"\n---\n## Description\n\n## History\n\n## Arc\n'
    )

    const before = await text('Loose thoughts.md')
    expect(
      await createSetEntryType({ repository, settings })(p('Loose thoughts.md'), 'note')
    ).toEqual({
      ok: true,
      value: undefined
    })
    const after = await text('Loose thoughts.md')
    expect(after).not.toBe(before)
    expect(after).toContain('type: note')
  })
})
