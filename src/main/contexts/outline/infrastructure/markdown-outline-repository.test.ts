import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { copySampleNovel, type SampleNovelCopy } from '../../../infrastructure/testing/sample-novel'
import type { ProjectPath } from '../../../shared-kernel/project-path'
import { createMarkdownOutlineRepository } from './markdown-outline-repository'

let copy: SampleNovelCopy

beforeEach(async () => {
  copy = await copySampleNovel()
})
afterEach(async () => {
  await copy.remove()
})

describe('markdown outline repository', () => {
  it('lists the sample’s outlines with their titles, and every file as taken', async () => {
    const { outlines, taken } = await createMarkdownOutlineRepository(copy.root).load()
    expect(outlines.map((outline) => [outline.path, outline.title]).sort()).toEqual([
      ['Working plan.md', 'Working plan'],
      ['outlines/Loose plan.md', 'Loose plan'],
      ['outlines/Not a board.md', 'Not a board'],
      ['outlines/Revision plan.md', 'Revision plan'],
      ['outlines/תוכנית.md', 'תוכנית עבודה']
    ])
    expect(taken).toContain('Loose thoughts.md')
    expect(taken).toHaveLength(35)
  })

  it('saves only the body, keeping the BOM, frontmatter comments and CRLF', async () => {
    const repository = createMarkdownOutlineRepository(copy.root)
    const path = 'outlines/Revision plan.md' as ProjectPath
    const before = await readFile(join(copy.root, path), 'utf8')
    const opened = await repository.readText(path)
    expect(opened.ok).toBe(true)
    if (!opened.ok) return
    const text = opened.value.text.replace('## Inbox', '## Later')
    expect(await repository.writeText(path, text, opened.value.version)).toMatchObject({ ok: true })
    expect(await readFile(join(copy.root, path), 'utf8')).toBe(
      before.replace('## Inbox', '## Later')
    )
  })
})
