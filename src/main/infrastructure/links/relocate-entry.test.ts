import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ProjectPath } from '../../shared-kernel/project-path'
import { copySampleNovel, type SampleNovelCopy } from '../testing/sample-novel'
import { previewRelocation, relocateEntry } from './relocate-entry'

let copy: SampleNovelCopy
const p = (value: string): ProjectPath => value as ProjectPath
const read = (path: string): Promise<string> =>
  readFile(join(copy.root, ...path.split('/')), 'utf8')
const write = (path: string, text: string): Promise<void> =>
  writeFile(join(copy.root, ...path.split('/')), text)

beforeEach(async () => {
  copy = await copySampleNovel()
})

afterEach(async () => {
  await copy.remove()
})

describe('renaming a chapter', () => {
  const from = p('manuscript/Part One/The Ferry.md')
  const to = p('manuscript/Part One/The Crossing.md')

  it('previews the links it would change, without writing anything', async () => {
    const before = await read('notes/Scene idea.md')
    expect(await previewRelocation(copy.root, from, to)).toEqual({
      changedFiles: ['notes/Scene idea.md'],
      linkCount: 1,
      skipped: []
    })
    expect(await read('notes/Scene idea.md')).toBe(before)
    expect(await read('manuscript/Part One/The Ferry.md')).toContain('type: chapter')
  })

  it('moves the file and updates links in frontmatter and body, nothing else', async () => {
    await write(
      'notes/Research.md',
      `${await read('notes/Research.md')}See [[The Ferry|the opening]] and \`[[The Ferry]]\`.\n`
    )
    const sceneBefore = await read('notes/Scene idea.md')
    const researchBefore = await read('notes/Research.md')

    const result = await relocateEntry(copy.root, from, to)

    expect(result.move).toBe('moved')
    expect(result.report).toEqual({
      changedFiles: ['notes/Research.md', 'notes/Scene idea.md'],
      linkCount: 2,
      skipped: []
    })
    expect(await read('notes/Scene idea.md')).toBe(
      sceneBefore.replace('[[The Ferry]]', '[[The Crossing]]')
    )
    expect(await read('notes/Research.md')).toBe(
      researchBefore.replace('[[The Ferry|the opening]]', '[[The Crossing|the opening]]')
    )
    expect(await read('manuscript/Part One/The Crossing.md')).toContain('title: The Ferry')
    await expect(read('manuscript/Part One/The Ferry.md')).rejects.toThrow()
  })

  it('refuses to replace an existing file, and touches nothing', async () => {
    const result = await relocateEntry(copy.root, from, p('manuscript/Part One/First frost.md'))
    expect(result.move).toBe('target-exists')
    expect(await read('notes/Scene idea.md')).toContain('[[The Ferry]]')
  })

  it('handles a case-only rename', async () => {
    const result = await relocateEntry(copy.root, from, p('manuscript/Part One/the ferry.md'))
    expect(result.move).toBe('moved')
    expect(await read('manuscript/Part One/the ferry.md')).toContain('type: chapter')
    expect(await read('notes/Scene idea.md')).toContain('[[the ferry]]')
  })
})

describe('renaming a part', () => {
  it('updates every chapter’s part link, keeping CRLF and comments', async () => {
    const frostBefore = await read('manuscript/Part One/First frost.md')
    const result = await relocateEntry(
      copy.root,
      p('manuscript/Part One/Part One.md'),
      p('manuscript/Part One/The Orchard.md')
    )

    expect(result.report.changedFiles).toEqual([
      'manuscript/Part One/First frost.md',
      'manuscript/Part One/Mixed endings.md',
      'manuscript/Part One/The Ferry.md',
      'manuscript/Part Three/Misfiled.md'
    ])
    expect(await read('manuscript/Part One/First frost.md')).toBe(
      frostBefore.replace('"[[Part One]]"', '"[[The Orchard]]"')
    )
  })
})

describe('moving between folders', () => {
  it('leaves name links alone and updates path links, keeping their depth', async () => {
    await write(
      'notes/Research.md',
      `${await read('notes/Research.md')}Also [[Part One/The Ferry]].\n`
    )
    const result = await relocateEntry(
      copy.root,
      p('manuscript/Part One/The Ferry.md'),
      p('manuscript/Part Two/The Ferry.md')
    )
    expect(result.report.changedFiles).toEqual(['notes/Research.md'])
    expect(await read('notes/Research.md')).toContain('Also [[Part Two/The Ferry]].')
    expect(await read('notes/Scene idea.md')).toContain('[[The Ferry]]')
  })
})

describe('names shared by two files', () => {
  it('renames only links that point to the renamed file', async () => {
    const result = await relocateEntry(
      copy.root,
      p('locations/Marrow.md'),
      p('locations/Marrow Village.md')
    )
    // Prose links to [[Marrow]] are ambiguous (a character shares the name) and stay as written;
    // the path link and the location keys are updated.
    expect(await read('notes/Research.md')).toContain(
      '[[Marrow]] is ambiguous in prose; [[locations/Marrow Village|Marrow]]'
    )
    expect(await read('manuscript/Part One/The Ferry.md')).toContain(
      'location: "[[Marrow Village]]"'
    )
    expect(await read('manuscript/Part One/The Ferry.md')).toContain('at [[Marrow]] while')
    expect(result.report.skipped).toEqual([])
  })
})
