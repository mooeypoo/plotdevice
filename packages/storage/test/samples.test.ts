import { createJournalStore, createProjectFolders } from '@plotdevice/fs-node'
import type { ProjectPath } from '@plotdevice/shared'
import { findLinks } from '@plotdevice/markdown'
import { cp, mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, posix, relative, sep } from 'node:path'
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
  return (
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      // Relative with the system's own separators first, then as the project path (always `/`).
      .map((entry) => posix.join(relative(root, entry.parentPath).split(sep).join('/'), entry.name))
  )
}

const demos = [
  {
    name: 'the-salt-orchard',
    language: 'en',
    chapters: 7,
    notInBook: ['manuscript/a-scene-for-later.md'],
    pages: { characters: 3, places: 3, notes: 3 },
    outlines: ['outlines/beas-path.md', 'outlines/main-story.md', 'outlines/the-arc-of-ilka.md'],
    mainOutline: 'outlines/main-story.md',
  },
  {
    name: 'מטע-המלח',
    language: 'he',
    chapters: 5,
    notInBook: [],
    pages: { characters: 3, places: 2, notes: 2 },
    outlines: ['outlines/הדרך של ביה.md', 'outlines/העלילה.md', 'outlines/הקשת של אילקה.md'],
    mainOutline: 'outlines/העלילה.md',
  },
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

  it('has characters with relationships, places and notes, and outlines whose cards link to them', async () => {
    const { root, references, outlines } = await open(demo.name)
    const pages = await references.listReferences(root)
    for (const [kind, count] of Object.entries(demo.pages))
      expect(
        pages.filter((page) => page.kind === kind),
        kind,
      ).toHaveLength(count)
    expect(pages.filter((page) => !page.description)).toEqual([])
    // The main story is named the main outline, so it opens first and names the timeline's columns;
    // a character's arc and Bea's path line up with it (Milestone 21).
    expect((await outlines.listOutlines(root)).map((outline) => outline.file)).toEqual(demo.outlines)
    const details = await readFile(join(root, 'project.md'), 'utf8')
    expect(details).toContain(`mainOutline: ${demo.mainOutline}\n`)
    for (const file of demo.outlines.filter((file) => file !== demo.mainOutline)) {
      const read = await outlines.readOutline(root, file as ProjectPath)
      expect(
        read.ok && read.value.outline.sections.filter((section) => section.lineUp?.outline === demo.mainOutline).length,
      ).toBeGreaterThan(1)
    }
    expect(pages.filter((page) => page.kind === 'characters' && page.relationships.length === 0)).toEqual([])
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
