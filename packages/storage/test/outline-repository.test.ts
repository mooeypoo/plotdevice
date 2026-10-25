import { applyOutlineEdit, type Outline, type OutlineEdit, type OutlineItem } from '@plotdevice/domain'
import { createProjectFolders } from '@plotdevice/fs-node'
import type { ProjectPath } from '@plotdevice/shared'
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createOutlineRepository } from '../src/index'

const PROJECT = join(import.meta.dirname, '../../../tests/fixtures/projects/salt-orchard')
const OUTLINE_FIXTURES = join(import.meta.dirname, '../../../tests/fixtures/outlines')
const MAIN = 'outlines/main-story.md' as ProjectPath
const p = (path: string) => path as ProjectPath
const dirs: string[] = []
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

async function setup() {
  const base = await mkdtemp(join(tmpdir(), 'plotdevice-outlines-'))
  dirs.push(base)
  const root = join(base, 'The Salt Orchard')
  await cp(PROJECT, root, { recursive: true })
  const repository = createOutlineRepository({ folders: createProjectFolders() })
  const bytes = (path: string) => readFile(join(root, path))
  const text = (path: string) => readFile(join(root, path), 'utf8')
  return { root, repository, bytes, text }
}

function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (!result.ok) throw new Error(`expected success, got ${JSON.stringify(result.error)}`)
  return result.value
}

/** What every view shows: the title, section names, and the card tree's text. */
const structure = (outline: Outline) => ({
  title: outline.title,
  sections: outline.sections.map((section) => ({ name: section.name, items: section.items.map(function tree(item: OutlineItem): unknown {
    return { text: item.text.trim(), children: item.children.map(tree) }
  }) })),
})

describe('outline files', () => {
  it('lists the outlines with their titles', async () => {
    const { root, repository } = await setup()
    expect(await repository.listOutlines(root)).toEqual([{ file: MAIN, title: 'Main story' }])
  })

  it('creates an outline named from its title, with just that title in it', async () => {
    const { root, repository, text } = await setup()
    const created = unwrap(await repository.createOutline(root, 'קשתות דמויות'))
    expect(created.file).toBe('outlines/קשתות-דמויות.md')
    expect(await text('outlines/קשתות-דמויות.md')).toBe('# קשתות דמויות\n')
    expect(unwrap(await repository.createOutline(root, 'קשתות דמויות')).file).toBe('outlines/קשתות-דמויות-2.md')
  })

  it('reads cards, details, and their links as written', async () => {
    const { root, repository } = await setup()
    const document = unwrap(await repository.readOutline(root, MAIN))
    expect(structure(document.outline).sections.map((s) => s.name)).toEqual(['Beginning', 'Ending'])
    expect(document.outline.sections[0]?.items[0]?.text).toBe('Ilka crosses the river, see [The Crossing](../manuscript/the-crossing.md)')
  })
})

describe('editing an outline file (scenario C, core half)', () => {
  it('moves a card to another section: only those lines change, and no chapter is touched', async () => {
    const { root, repository, bytes, text } = await setup()
    const chaptersBefore = await Promise.all((await readdir(join(root, 'manuscript'))).map(async (name) => [name, await bytes(`manuscript/${name}`)] as const))
    const before = unwrap(await repository.readOutline(root, MAIN))
    const edited = unwrap(await repository.editOutline(root, MAIN, { kind: 'move-item', from: { section: 0, path: [1] }, to: { section: 1, parentPath: [], index: 0 } }, before.revision, null))
    expect(await text(MAIN)).toBe(
      '# Main story\n\n## Beginning\n\n- Ilka crosses the river, see [The Crossing](../manuscript/the-crossing.md)\n  - Bea at the landing\n\n## Ending\n\n- The gate, see [The Orchard Gate](../manuscript/the-orchard-gate.md)\n- Back to [the crossing](../manuscript/the-crossing.md "first chapter") for the last image\n',
    )
    expect(edited.previous).toBe((await readFile(join(PROJECT, MAIN), 'utf8')))
    for (const [name, content] of chaptersBefore) expect(await bytes(`manuscript/${name}`)).toEqual(content)
  })

  it('refuses an edit when the file changed since it was read, and leaves it alone', async () => {
    const { root, repository, text } = await setup()
    const before = unwrap(await repository.readOutline(root, MAIN))
    await writeFile(join(root, MAIN), '# Main story\n\n## Rewritten elsewhere\n')
    expect(await repository.editOutline(root, MAIN, { kind: 'delete-section', section: 0 }, before.revision, null)).toEqual({ ok: false, error: 'stale' })
    expect(await text(MAIN)).toBe('# Main story\n\n## Rewritten elsewhere\n')
  })

  it('undo puts back the exact bytes, but only over its own edit', async () => {
    const { root, repository, bytes } = await setup()
    const original = await bytes(MAIN)
    const before = unwrap(await repository.readOutline(root, MAIN))
    const edited = unwrap(await repository.editOutline(root, MAIN, { kind: 'delete-section', section: 1 }, before.revision, null))
    unwrap(await repository.restoreOutline(root, MAIN, edited.previous, edited.document.revision))
    expect(await bytes(MAIN)).toEqual(original)
    expect(await repository.restoreOutline(root, MAIN, edited.previous, edited.document.revision)).toEqual({ ok: false, error: 'stale' })
  })

  it('keeps a byte-order mark and Windows line endings through edits', async () => {
    const { root, repository, bytes } = await setup()
    await writeFile(join(root, 'outlines/windows.md'), '﻿# Plan\r\n\r\n## One\r\n\r\n- a\r\n- b\r\n')
    const before = unwrap(await repository.readOutline(root, p('outlines/windows.md')))
    unwrap(await repository.editOutline(root, p('outlines/windows.md'), { kind: 'add-item', to: { section: 0, parentPath: [0], index: 0 }, text: 'detail' }, before.revision, null))
    expect((await bytes('outlines/windows.md')).toString('utf8')).toBe('﻿# Plan\r\n\r\n## One\r\n\r\n- a\r\n  - detail\r\n- b\r\n')
  })

  it('reports a file that is not valid UTF-8 as unreadable, and never writes it', async () => {
    const { root, repository, bytes } = await setup()
    await writeFile(join(root, 'outlines/broken.md'), new Uint8Array([0x2d, 0x20, 0xff, 0xfe, 0x0a]))
    expect(await repository.readOutline(root, p('outlines/broken.md'))).toEqual({ ok: false, error: 'unreadable' })
    expect([...(await bytes('outlines/broken.md'))]).toEqual([0x2d, 0x20, 0xff, 0xfe, 0x0a])
  })

  it('passes on the refusals of the outline editor', async () => {
    const { root, repository } = await setup()
    await writeFile(join(root, 'outlines/setext.md'), 'Two line\nheading\n---\n\n- card\n')
    const before = unwrap(await repository.readOutline(root, p('outlines/setext.md')))
    expect(await repository.editOutline(root, p('outlines/setext.md'), { kind: 'rename-section', section: 0, text: 'x' }, before.revision, null)).toEqual({ ok: false, error: 'multiline-heading' })
  })
})

describe('the file and the domain agree: every card moved to the end of every section, on every outline fixture', () => {
  it('reading the edited file gives what the domain predicts', async () => {
    const { root, repository } = await setup()
    await mkdir(join(root, 'outlines/fixtures'))
    const names = (await readdir(OUTLINE_FIXTURES)).filter((name) => name.endsWith('.md') && name !== 'README.md')
    let checked = 0
    for (const name of names) {
      const file = p(`outlines/fixtures/${name}`)
      const original = await readFile(join(OUTLINE_FIXTURES, name))
      const start = unwrap(await repository.readOutline(root, (await writeFile(join(root, file), original), file)))
      const moves: OutlineEdit[] = []
      start.outline.sections.forEach((section, from) =>
        section.items.forEach((item, index) => {
          if (!item.movable) return
          start.outline.sections.forEach((target, to) => moves.push({ kind: 'move-item', from: { section: from, path: [index] }, to: { section: to, parentPath: [], index: target.items.length - (to === from ? 1 : 0) } }))
        }),
      )
      for (const edit of moves) {
        await writeFile(join(root, file), original)
        const before = unwrap(await repository.readOutline(root, file))
        const expected = unwrap(applyOutlineEdit(before.outline, edit))
        const after = unwrap(await repository.editOutline(root, file, edit, before.revision, before.nestingUnit))
        expect(structure(after.document.outline), `${name}: ${JSON.stringify(edit)}`).toEqual(structure(expected))
        expect(structure(unwrap(await repository.readOutline(root, file)).outline)).toEqual(structure(expected))
        checked++
      }
    }
    expect(checked).toBeGreaterThan(100)
  })
})
