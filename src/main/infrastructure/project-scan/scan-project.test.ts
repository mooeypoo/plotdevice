import { chmod, mkdir, symlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { copySampleNovel, type SampleNovelCopy } from '../testing/sample-novel'
import { scanProject } from './scan-project'

let copy: SampleNovelCopy

beforeEach(async () => {
  copy = await copySampleNovel()
})

afterEach(async () => {
  await copy.remove()
})

const typed = (type: string): object => ({ classification: { kind: 'typed', type } })
const untyped = (extra: object = {}): object => ({ classification: { kind: 'untyped' }, ...extra })

describe('scanProject on the sample novel', () => {
  it('classifies every markdown file by its type key', async () => {
    const { files, nestedProjects } = await scanProject(copy.root)

    expect(Object.fromEntries(files.map(({ path, ...rest }) => [path, rest]))).toEqual({
      'Loose thoughts.md': untyped(),
      'characters/Harbor.md': typed('character'),
      'characters/Mira Kovač.md': typed('character'),
      'characters/Old Tal.md': typed('character'),
      'characters/Zoe\u0308.md': typed('character'),
      'characters/נועה.md': typed('character'),
      'locations/Harbor.md': typed('location'),
      'manuscript/Part One/Arrival.md': typed('chapter'),
      'manuscript/Part One/First night.md': typed('chapter'),
      'manuscript/Part One/Lanterns.md': untyped(),
      'manuscript/Part One/Mixed endings.md': typed('chapter'),
      'manuscript/Part One/Part One.md': typed('part'),
      'manuscript/Part Three/Lost part.md': typed('chapter'),
      'manuscript/Part Three/Misfiled.md': typed('chapter'),
      'manuscript/Part Three/No order.md': typed('chapter'),
      'manuscript/Part Three/Part Three.md': typed('part'),
      'manuscript/Part Three/חזרה.md': typed('chapter'),
      'manuscript/Part Two/Broken.md': untyped({ problem: 'unparseable-frontmatter' }),
      'manuscript/Part Two/Café Ñandú.md': typed('chapter'),
      'manuscript/Part Two/Duplicate order.md': typed('chapter'),
      'manuscript/Part Two/Empty frontmatter.md': untyped(),
      'manuscript/Part Two/Part Two.md': typed('part'),
      'manuscript/Part Two/Shapes.md': typed('chapter'),
      'manuscript/Part Two/The Archive.md': typed('chapter'),
      'notes/Chapter #3 [draft].md': typed('note'),
      'notes/Research.md': typed('note'),
      'notes/Scene idea.md': typed('scene'),
      'notes/Unclosed.md': untyped({ problem: 'unclosed-frontmatter' }),
      'notes/Unknown type.md': { classification: { kind: 'untyped', rawType: 'spaceship' } },
      'notes/Windows-1255.md': untyped({ problem: 'invalid-encoding' })
    })
    expect(nestedProjects).toEqual([])
  })

  it('returns files in a stable, locale-independent order', async () => {
    const paths = (await scanProject(copy.root)).files.map((file) => file.path)
    expect(paths).toEqual([...paths].sort())
  })

  it('skips dot-folders and novel.md itself', async () => {
    const paths = (await scanProject(copy.root)).files.map((file) => file.path)
    expect(paths.some((path) => path.startsWith('.obsidian/'))).toBe(false)
    expect(paths).not.toContain('novel.md')
  })

  it('skips a nested project and reports it', async () => {
    await mkdir(join(copy.root, 'notes', 'old-draft'))
    await writeFile(join(copy.root, 'notes', 'old-draft', 'novel.md'), '---\nformat: 1\n---\n')
    await writeFile(
      join(copy.root, 'notes', 'old-draft', 'Chapter.md'),
      '---\ntype: chapter\n---\n'
    )

    const { files, nestedProjects } = await scanProject(copy.root)

    expect(nestedProjects).toEqual(['notes/old-draft'])
    expect(files.some((file) => file.path.startsWith('notes/old-draft/'))).toBe(false)
  })

  it('ignores files that are not markdown', async () => {
    await writeFile(join(copy.root, 'notes', 'cover.png'), 'not really a png')
    const paths = (await scanProject(copy.root)).files.map((file) => file.path)
    expect(paths).not.toContain('notes/cover.png')
  })

  it.skipIf(process.platform === 'win32')(
    'reads linked files but does not follow linked folders',
    async () => {
      await symlink(join(copy.root, 'characters'), join(copy.root, 'notes', 'people'))
      await symlink(join(copy.root, 'locations', 'Harbor.md'), join(copy.root, 'notes', 'Port.md'))

      const paths = (await scanProject(copy.root)).files.map((file) => file.path)

      expect(paths).toContain('notes/Port.md')
      expect(paths.some((path) => path.startsWith('notes/people/'))).toBe(false)
    }
  )

  it.skipIf(process.platform === 'win32' || process.getuid?.() === 0)(
    'reports a file it is not allowed to read',
    async () => {
      const locked = join(copy.root, 'notes', 'Research.md')
      await chmod(locked, 0o000)

      const research = (await scanProject(copy.root)).files.find(
        (file) => file.path === 'notes/Research.md'
      )

      expect(research).toMatchObject({ problem: 'unreadable-file' })
      await chmod(locked, 0o644)
    }
  )
})
