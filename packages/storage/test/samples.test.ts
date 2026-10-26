import { createJournalStore, createProjectFolders } from '@plotdevice/fs-node'
import { findLinks } from '@plotdevice/markdown'
import { cp, mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, posix } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createOutlineRepository, createProjectRepository, createReferenceRepository } from '../src/index'

/** The demo novels in `samples/`: invented, for trying and showing the app. They must open cleanly and every link must work. */
const SAMPLES = join(import.meta.dirname, '../../../samples')
const dirs: string[] = []
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

async function open(name: string) {
  const base = await mkdtemp(join(tmpdir(), 'plotdevice-sample-'))
  dirs.push(base)
  const root = join(base, name)
  await cp(join(SAMPLES, name), root, { recursive: true })
  const folders = createProjectFolders()
  const repository = createProjectRepository({
    folders,
    journals: createJournalStore(join(base, 'app-data')),
    ids: { next: (prefix) => `${prefix}-test01` },
  })
  const opened = await repository.open(root)
  if (!opened.ok) throw new Error(`${name} did not open: ${opened.error}`)
  return {
    root,
    snapshot: opened.value,
    references: createReferenceRepository({ folders }),
    outlines: createOutlineRepository({ folders }),
  }
}

async function markdownFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { recursive: true, withFileTypes: true })
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => posix.join(posix.relative(root, entry.parentPath.split('\\').join('/')), entry.name))
}

const demos = [
  {
    name: 'the-salt-orchard',
    language: 'en',
    chapters: 7,
    notInBook: ['manuscript/a-scene-for-later.md'],
    pages: { character: 3, place: 3, note: 3 },
  },
  { name: 'מטע-המלח', language: 'he', chapters: 5, notInBook: [], pages: { character: 3, place: 2, note: 2 } },
]

describe.each(demos)('the demo novel $name', (demo) => {
  it('opens with nothing missing, mismatched or warned about', async () => {
    const { snapshot } = await open(demo.name)
    expect(snapshot.details.language).toBe(demo.language)
    expect(snapshot.warnings).toEqual([])
    expect(snapshot.missing).toEqual([])
    expect(snapshot.outdatedLinkText).toEqual([])
    expect(snapshot.duplicateIds).toEqual([])
    expect(snapshot.chapters.filter((chapter) => chapter.status !== 'ok')).toEqual([])
    expect(snapshot.chapters.filter((chapter) => chapter.listed)).toHaveLength(demo.chapters)
    expect(snapshot.chapters.filter((chapter) => !chapter.listed).map((chapter) => chapter.file)).toEqual(demo.notInBook)
    expect(snapshot.contents.entries.some((entry) => entry.kind === 'part')).toBe(true)
  })

  it('has characters, places and notes, and an outline whose cards link to them', async () => {
    const { root, references, outlines } = await open(demo.name)
    const pages = await references.listReferences(root)
    for (const [kind, count] of Object.entries(demo.pages))
      expect(
        pages.filter((page) => page.kind === kind),
        kind,
      ).toHaveLength(count)
    expect(pages.filter((page) => !page.description)).toEqual([])
    expect(await outlines.listOutlines(root)).toHaveLength(1)
    const linked = (await references.cardLinks(root)).flatMap((card) => card.links)
    expect(linked.some((file) => file.startsWith('characters/'))).toBe(true)
    expect(linked.some((file) => file.startsWith('places/'))).toBe(true)
    expect(linked.some((file) => file.startsWith('manuscript/'))).toBe(true)
  })

  it('has no broken links, in any file', async () => {
    const { root } = await open(demo.name)
    const files = await markdownFiles(root)
    const broken: string[] = []
    let links = 0
    for (const file of files) {
      for (const link of findLinks(await readFile(join(root, file), 'utf8'), posix.dirname(file))) {
        links++
        if (link.kind === 'path' && !files.includes(link.target)) broken.push(`${file} → ${link.target}`)
        if (link.kind === 'wiki') broken.push(`${file} → [[${link.name}]] (the demo uses ordinary links)`)
      }
    }
    expect(broken).toEqual([])
    expect(links).toBeGreaterThan(10)
  })
})
