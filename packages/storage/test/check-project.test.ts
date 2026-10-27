import { createFileStore } from '@plotdevice/fs-node'
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { checkProject, type CheckFinding } from '../src/index'

const SAMPLES = join(import.meta.dirname, '../../../samples')
const dirs: string[] = []
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

async function folder(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'plotdevice-check-'))
  dirs.push(root)
  for (const [path, text] of Object.entries(files)) {
    await mkdir(dirname(join(root, path)), { recursive: true })
    await writeFile(join(root, path), text)
  }
  return root
}

/** A small, correct book, which each test breaks in one way. */
const BOOK = {
  'project.md': '---\ntitle: The Glass Weir\nlanguage: en\n---\n',
  'CONTENTS.md': '# The Glass Weir\n\n- Part One\n  - [The Flood](manuscript/the-flood.md)\n',
  'manuscript/the-flood.md': '---\ntitle: The Flood\n---\nThe river rose, as [Oren](../characters/oren.md) said it would.\n',
  'characters/oren.md': '---\ntitle: Oren\n---\nKeeps the weir.\n\n## Relationships\n- Works at [the mill](../places/mill.md)\n',
  'places/mill.md': '# The Mill\nBelow the weir.\n',
  'outlines/main-story.md': '# Main story\n\n## Beginning\n\n- The flood, see [The Flood](../manuscript/the-flood.md)\n',
}

const check = async (root: string) => checkProject(createFileStore(root))
const codes = (findings: readonly CheckFinding[]) => findings.map((f) => `${f.severity} ${f.code} ${f.file}${f.line ? `:${f.line}` : ''}`)

describe('checking a book', () => {
  it.each(['the-salt-orchard', 'מטע-המלח'])('finds nothing to fix in the demo novel %s', async (name) => {
    const root = await mkdtemp(join(tmpdir(), 'plotdevice-check-'))
    dirs.push(root)
    await cp(join(SAMPLES, name), root, { recursive: true })
    const result = await check(root)
    expect(result.findings.filter((f) => f.severity === 'fix')).toEqual([])
  })

  it('counts what the book has', async () => {
    const result = await check(await folder(BOOK))
    expect(result.title).toBe('The Glass Weir')
    expect(result.counts).toEqual({ chapters: 1, characters: 1, places: 1, notes: 0, outlines: 1 })
    expect(result.findings).toEqual([])
  })

  it('finds a folder that isn’t a book', async () => {
    expect(codes((await check(await folder({ 'notes.md': '# Notes\n' }))).findings)).toEqual([
      'fix missing-file project.md',
      'fix missing-file CONTENTS.md',
    ])
  })

  it('finds a project file it can’t read', async () => {
    const root = await folder({ ...BOOK, 'project.md': '---\nauthor: Nobody\n---\n' })
    expect(codes((await check(root)).findings)).toEqual(['fix unreadable-project-file project.md'])
  })

  it('finds a contents link to a chapter that isn’t there, and a chapter not in the contents', async () => {
    const root = await folder({
      ...BOOK,
      'CONTENTS.md': '# The Glass Weir\n\n- [The Flood](manuscript/the-flood.md)\n- [The Thaw](manuscript/the-thaw.md)\n',
      'manuscript/unused-opening.md': '---\ntitle: Unused opening\n---\nIt began, once, differently.\n',
    })
    expect(codes((await check(root)).findings)).toEqual([
      'fix missing-chapter CONTENTS.md:4',
      'know not-in-book manuscript/unused-opening.md',
    ])
  })

  it('finds links in chapters, pages and outlines to files that aren’t there, with their lines', async () => {
    const root = await folder({
      ...BOOK,
      'manuscript/the-flood.md': '---\ntitle: The Flood\n---\nThe river rose.\n\nOren went to [the dam](../places/dam.md).\n',
      'characters/oren.md': '---\ntitle: Oren\n---\nKeeps the weir.\n\n## Relationships\n- Brother of [[Yael]]\n',
      'outlines/main-story.md': '# Main story\n\n## Beginning\n\n- The flood\n  - see [The Thaw](../manuscript/the-thaw.md)\n',
    })
    const { findings } = await check(root)
    expect(codes(findings)).toEqual([
      'fix broken-link characters/oren.md:7',
      'fix broken-link manuscript/the-flood.md:6',
      'fix broken-link outlines/main-story.md:6',
    ])
    expect(findings.map((f) => f.detail)).toEqual(['Yael', 'places/dam.md', 'manuscript/the-thaw.md'])
  })

  it('finds a [[name]] two files share, but not one that names exactly one file', async () => {
    const root = await folder({
      ...BOOK,
      'notes/mill.md': 'How the mill works.\n',
      'characters/oren.md': '---\ntitle: Oren\n---\nKeeps [[mill]], near [[the-flood]].\n',
    })
    expect(codes((await check(root)).findings)).toEqual(['fix ambiguous-link characters/oren.md:4'])
  })

  it('finds details that aren’t valid YAML, in chapters and pages', async () => {
    const root = await folder({
      ...BOOK,
      'manuscript/the-flood.md': '---\ntitle: [The Flood\n---\nThe river rose.\n',
      'places/mill.md': '---\ntitle: The Mill\ntags: [a, b\n---\nBelow the weir.\n',
    })
    expect(codes((await check(root)).findings)).toEqual([
      'fix unreadable-details manuscript/the-flood.md',
      'fix unreadable-details places/mill.md',
    ])
  })

  it('mentions Markdown files outside the book’s folders, which the app doesn’t show', async () => {
    const root = await folder({ ...BOOK, 'README.md': '# About\n', 'world/magic.md': '# Magic\n', 'assets/map.md': '# Map\n' })
    expect(codes((await check(root)).findings)).toEqual([
      'know outside-folders README.md',
      'know outside-folders assets/map.md',
      'know outside-folders world/magic.md',
    ])
  })

  it('mentions lines in the contents that aren’t chapters or parts, and outdated link text', async () => {
    const root = await folder({
      ...BOOK,
      'CONTENTS.md': '# The Glass Weir\n\nWritten in the winter.\n\n- [The Floods](manuscript/the-flood.md)\n',
    })
    expect(codes((await check(root)).findings)).toEqual(['know ignored-content CONTENTS.md:3', 'know outdated-link-text CONTENTS.md:5'])
  })

  it('handles spaces, Hebrew names and CRLF', async () => {
    const root = await folder({
      'project.md': '---\r\ntitle: מטע המלח\r\nlanguage: he\r\n---\r\n',
      'CONTENTS.md': '# מטע המלח\r\n\r\n- [המעבר](<manuscript/the crossing.md>)\r\n',
      'manuscript/the crossing.md':
        '---\r\ntitle: המעבר\r\n---\r\nאילקה ו[בֵּאָה](../characters/בֵּאָה.md) ו[נואל](../characters/נואל.md).\r\n',
      'characters/בֵּאָה.md': '---\r\ntitle: בֵּאָה\r\n---\r\nהדודה.\r\n',
    })
    expect(codes((await check(root)).findings)).toEqual(['fix broken-link manuscript/the crossing.md:4'])
  })

  it('changes nothing in the folder', async () => {
    const root = await folder({ ...BOOK, 'places/mill.md': '---\ntitle: [x\n---\n', 'CONTENTS.md': 'not a list\n' })
    const before = await snapshot(root)
    await check(root)
    expect(await snapshot(root)).toEqual(before)
  })
})

async function snapshot(root: string): Promise<Record<string, string>> {
  const entries = await readdir(root, { recursive: true, withFileTypes: true })
  const files = entries.filter((entry) => entry.isFile()).map((entry) => join(entry.parentPath, entry.name))
  return Object.fromEntries(await Promise.all(files.map(async (file) => [file, await readFile(file, 'latin1')] as const)))
}
