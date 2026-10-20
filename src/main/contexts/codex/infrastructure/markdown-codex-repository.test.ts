import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ProjectPath } from '../../../shared-kernel/project-path'
import { copySampleNovel, type SampleNovelCopy } from '../../../infrastructure/testing/sample-novel'
import { createCreateCodexEntry } from '../application/commands/create-codex-entry'
import { createUpdateRelationships } from '../application/commands/update-relationships'
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
  templateFolder: p('templates'),
  fileNames: 'ask'
}

beforeEach(async () => {
  copy = await copySampleNovel()
})

afterEach(async () => {
  await copy.remove()
})

describe('the sample novel’s codex', () => {
  it('changes and removes groups while preserving every other byte, including CRLF, BOM, comments, tags and body', async () => {
    const repository = createMarkdownCodexRepository(copy.root)
    const path = p('characters/Ilka Szabó.md')
    const source =
      '\uFEFF---\r\ntype: character\r\n# Cast organization\r\ngroups: [Main] # keep\r\ntags: [cast]\r\ncustom: yes\r\n---\r\n## Bio\r\nUnchanged.'
    await writeFile(join(copy.root, path), source)
    const read = await createGetCodexProperties({ repository })(path)
    if (!read.ok) throw new Error('expected properties')
    const update = createUpdateCodexProperties({ repository, settings })
    const updated = await update(path, read.value.version, { groups: ['Main', 'Part 2'] })
    expect(updated.ok).toBe(true)
    expect(await text(path)).toBe(source.replace('[Main]', '[Main, Part 2]'))
    if (!updated.ok) throw new Error('expected updated groups')
    const unchanged = await text(path)
    await update(path, updated.value.version, { groups: ['Main', 'Part 2'] })
    expect(await text(path)).toBe(unchanged)
    const removed = await update(path, updated.value.version, { groups: [] })
    expect(removed.ok).toBe(true)
    expect(await text(path)).toBe(source.replace('groups: [Main] # keep\r\n', ''))
  })

  it('lists characters, locations, notes, and readable untyped files', async () => {
    const listing = await createListCodex({
      repository: createMarkdownCodexRepository(copy.root),
      settings
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

describe('relationships on disk', () => {
  it('changes one relationship’s kind and adds one, touching nothing else', async () => {
    const repository = createMarkdownCodexRepository(copy.root)
    const path = p('characters/Ilka Szabó.md')
    const before = await text(path)
    const read = await createGetCodexProperties({ repository })(path)
    if (!read.ok) throw new Error('expected properties')

    const updated = await createUpdateRelationships({ repository, settings })(
      path,
      read.value.version,
      [
        { with: 'Aunt Bea', kind: 'teacher', note: 'Taught her to graft pear trees.' },
        { with: 'יעל', kind: 'friend' },
        { with: 'Noël', kind: 'rival' }
      ]
    )
    expect(updated).toMatchObject({ ok: true })
    expect(await text(path)).toBe(
      before
        .replace('kind: mentor', 'kind: teacher')
        .replace('    kind: friend\n', '    kind: friend\n  - with: "[[Noël]]"\n    kind: rival\n')
    )
  })

  it('shows who lists a character', async () => {
    const repository = createMarkdownCodexRepository(copy.root)
    const read = await createGetCodexProperties({ repository })(p('characters/Aunt Bea.md'))
    expect(read).toMatchObject({
      ok: true,
      value: { listedBy: [{ path: 'characters/Ilka Szabó.md', kind: 'mentor' }] }
    })
  })
})
