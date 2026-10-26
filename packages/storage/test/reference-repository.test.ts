import { createProjectFolders } from '@plotdevice/fs-node'
import type { ProjectPath } from '@plotdevice/shared'
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createReferenceRepository } from '../src/index'

const PROJECT = join(import.meta.dirname, '../../../tests/fixtures/projects/salt-orchard')
const p = (path: string) => path as ProjectPath
const dirs: string[] = []
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

async function setup() {
  const base = await mkdtemp(join(tmpdir(), 'plotdevice-refs-'))
  dirs.push(base)
  const root = join(base, 'The Salt Orchard')
  await cp(PROJECT, root, { recursive: true })
  await mkdir(join(root, 'characters'))
  await mkdir(join(root, 'places'))
  await writeFile(
    join(root, 'characters/ilka.md'),
    '---\ntitle: Ilka Varga\naka: [Ilka]\npov: true # her chapters\n---\nInherits the orchard.\n\n## Family\nBea is her aunt.\n',
  )
  await writeFile(join(root, 'places/marrow.md'), '# Marrow\nWhere the orchard is.\n')
  const repository = createReferenceRepository({ folders: createProjectFolders() })
  const text = (path: string) => readFile(join(root, path), 'utf8')
  return { root, repository, text }
}

function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (!result.ok) throw new Error(`expected success, got ${JSON.stringify(result.error)}`)
  return result.value
}

describe('reference pages', () => {
  it('lists characters, places and notes, including pages written in other apps', async () => {
    const { root, repository } = await setup()
    expect(await repository.listReferences(root)).toEqual([
      {
        file: 'characters/ilka.md',
        kind: 'character',
        title: 'Ilka Varga',
        aka: ['Ilka'],
        description: 'Inherits the orchard.',
        relationships: [],
        links: [],
      },
      {
        file: 'notes/crossing-notes.md',
        kind: 'note',
        title: expect.any(String) as string,
        aka: [],
        description: expect.anything() as string,
        relationships: [],
        links: expect.any(Array) as ProjectPath[],
      },
      {
        file: 'notes/loose-ideas.md',
        kind: 'note',
        title: 'Loose ideas',
        aka: [],
        description: expect.stringMatching(/^Maybe open/) as string,
        relationships: [],
        links: expect.any(Array) as ProjectPath[],
      },
      {
        file: 'places/marrow.md',
        kind: 'place',
        title: 'Marrow',
        aka: [],
        description: 'Where the orchard is.',
        relationships: [],
        links: [],
      },
    ])
  })

  it('adds a relationship under a heading in the project’s language, and lists it with the links it resolves', async () => {
    const { root, repository, text } = await setup()
    await writeFile(join(root, 'characters/yael.md'), '---\ntitle: יעל\n---\nאחותה של אילקה.\n')
    unwrap(await repository.editRelationship(root, p('characters/yael.md'), { kind: 'add', text: 'אחות של [[ilka]]' }, 'he-IL'))
    unwrap(
      await repository.editRelationship(
        root,
        p('characters/ilka.md'),
        { kind: 'add', text: 'Lives in [Marrow](../places/marrow.md)' },
        'en',
      ),
    )
    expect(await text('characters/yael.md')).toBe('---\ntitle: יעל\n---\nאחותה של אילקה.\n\n## קשרים\n\n- אחות של [[ilka]]\n')
    const pages = await repository.listReferences(root)
    expect(pages.find((page) => page.file === 'characters/yael.md')).toMatchObject({
      relationships: [{ text: 'אחות של [[ilka]]', links: ['characters/ilka.md'] }],
      links: ['characters/ilka.md'],
    })
    expect(pages.find((page) => page.file === 'characters/ilka.md')?.relationships).toEqual([
      { text: 'Lives in [Marrow](../places/marrow.md)', links: ['places/marrow.md'] },
    ])
    expect(await repository.editRelationship(root, p('characters/ilka.md'), { kind: 'remove', index: 4 }, 'en')).toEqual({
      ok: false,
      error: 'missing',
    })
  })

  it('lists the links in chapters, leaving out chapters without any', async () => {
    const { root, repository } = await setup()
    await writeFile(join(root, 'manuscript/frost.md'), '---\ntitle: Frost\n---\nWith [Ilka](../characters/ilka.md) and [[marrow]].\n')
    expect(await repository.fileLinks(root, [p('manuscript/frost.md'), p('manuscript/epilogue.md')])).toEqual([
      { file: 'manuscript/frost.md', links: ['characters/ilka.md', 'places/marrow.md'] },
    ])
  })

  it('reads a page with its details', async () => {
    const { root, repository } = await setup()
    expect(unwrap(await repository.readReference(root, p('characters/ilka.md')))).toMatchObject({
      title: 'Ilka Varga',
      details: '## Family\nBea is her aunt.\n',
      invalidDetails: false,
    })
  })

  it('creates pages named from their titles, in Hebrew too', async () => {
    const { root, repository, text } = await setup()
    expect(unwrap(await repository.createReference(root, 'character', 'יעל'))).toEqual({
      file: 'characters/יעל.md',
      kind: 'character',
      title: 'יעל',
      aka: [],
      description: null,
      relationships: [],
      links: [],
    })
    expect(await text('characters/יעל.md')).toBe('---\ntitle: יעל\n---\n')
    expect(unwrap(await repository.createReference(root, 'place', 'Marrow')).file).toBe('places/marrow-2.md')
  })

  it('renames a page, changing only its title and keeping its other details and comments', async () => {
    const { root, repository, text } = await setup()
    unwrap(await repository.renameReference(root, p('characters/ilka.md'), 'Ilka'))
    expect(await text('characters/ilka.md')).toBe(
      '---\ntitle: Ilka\naka: [Ilka]\npov: true # her chapters\n---\nInherits the orchard.\n\n## Family\nBea is her aunt.\n',
    )
  })
})

describe('the links outline cards make', () => {
  it('collects each card’s links, from its details too, and resolves wiki links only when they are unambiguous', async () => {
    const { root, repository } = await setup()
    await writeFile(
      join(root, 'outlines/arcs.md'),
      '# Arcs\n\n## Ilka\n\n- She crosses, see [The Crossing](../manuscript/the-crossing.md)\n  - with [[ilka]] and [[marrow]]\n- No links here\n- A missing page: [Nobody](../characters/nobody.md)\n',
    )
    const cards = await repository.cardLinks(root)
    expect(cards.find((card) => card.outline === 'outlines/arcs.md')).toEqual({
      outline: 'outlines/arcs.md',
      outlineTitle: 'Arcs',
      section: 'Ilka',
      card: 'She crosses, see [The Crossing](../manuscript/the-crossing.md)',
      links: ['manuscript/the-crossing.md', 'characters/ilka.md', 'places/marrow.md'],
    })
    expect(cards.filter((card) => card.outline === 'outlines/arcs.md')).toHaveLength(1)
    expect(cards.filter((card) => card.outline === 'outlines/main-story.md').map((card) => card.links)).toEqual([
      ['manuscript/the-crossing.md'],
      ['manuscript/the-orchard-gate.md'],
      ['manuscript/the-crossing.md'],
    ])
  })
})
