import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ProjectPath } from '../../../shared-kernel/project-path'
import { copySampleNovel, type SampleNovelCopy } from '../../../infrastructure/testing/sample-novel'
import { createMoveChapter } from '../application/commands/move-entries'
import { createPlanRename, createRenameEntry } from '../application/commands/rename-entry'
import type { ManuscriptSettings } from '../domain/manuscript-settings'
import { createMarkdownEntryRelocator } from '../../../infrastructure/links/markdown-entry-relocator'
import { createMarkdownManuscriptRepository } from './markdown-manuscript-repository'

let copy: SampleNovelCopy
const p = (value: string): ProjectPath => value as ProjectPath
const settings: ManuscriptSettings = {
  readOnly: false,
  partFolder: p('manuscript'),
  chapterFolder: p('manuscript'),
  fileNames: 'ask'
}
const text = (path: string): Promise<string> =>
  readFile(join(copy.root, ...path.split('/')), 'utf8')

function ports(): Parameters<typeof createMoveChapter>[0] {
  return {
    repository: createMarkdownManuscriptRepository(copy.root),
    relocator: createMarkdownEntryRelocator(copy.root),
    settings
  }
}

beforeEach(async () => {
  copy = await copySampleNovel()
})

afterEach(async () => {
  await copy.remove()
})

describe('moving a chapter to another part, on disk', () => {
  it('rewrites part and the orders that change, and moves the file into the part’s folder', async () => {
    const cannery = await text('manuscript/Part Two/The Cannery.md')
    const ferry = await text('manuscript/Part One/The Ferry.md')
    const broken = await text('manuscript/Part Two/Broken.md')

    const moved = await createMoveChapter(ports())(p('manuscript/Part One/The Ferry.md'), {
      part: p('manuscript/Part Two/Part Two.md'),
      index: 1
    })

    expect(moved).toEqual({
      ok: true,
      value: { path: 'manuscript/Part Two/The Ferry.md', changed: 4, failed: [] }
    })
    expect(await text('manuscript/Part Two/The Ferry.md')).toBe(
      ferry.replace('part: "[[Part One]]"', 'part: "[[Part Two]]"').replace('order: 1', 'order: 2')
    )
    expect(await text('manuscript/Part Two/The Cannery.md')).toBe(cannery)
    expect(await text('manuscript/Part Two/Shapes.md')).toContain('order: 5')
    expect(await text('manuscript/Part Two/Broken.md')).toBe(broken)
    // A name link still finds the file in its new folder.
    expect(await text('notes/Scene idea.md')).toContain('[[The Ferry]]')
  })
})

describe('renaming a part to match its title, on disk', () => {
  it('updates the chapters’ part links and reports the file it couldn’t update', async () => {
    const part = p('manuscript/Part Two/Part Two.md')
    const plan = await createPlanRename(ports())(part)
    if (!plan.ok || plan.value === null) throw new Error('expected a rename plan')
    const { newPath } = plan.value
    expect(newPath.startsWith('manuscript/Part Two/Part Two')).toBe(true)

    const renamed = await createRenameEntry(ports())(part)
    expect(renamed).toMatchObject({ ok: true, value: { path: newPath } })
    if (!renamed.ok) return
    expect(renamed.value.links.linkCount).toBe(plan.value.linkCount)
    expect(renamed.value.links.skipped).toContain('manuscript/Part Two/Broken.md')

    const stem = newPath.slice(newPath.lastIndexOf('/') + 1, -'.md'.length)
    expect(await text('manuscript/Part Two/Shapes.md')).toContain(`part: "[[${stem}]]"`)
    expect(await text('manuscript/Part Two/Broken.md')).toContain('part: "[[Part Two]]')
  })
})
