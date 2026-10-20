import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ProjectPath } from '../../../shared-kernel/project-path'
import { copySampleNovel, type SampleNovelCopy } from '../../../infrastructure/testing/sample-novel'
import { createFixWarning } from '../application/commands/fix-warning'
import { createGetManuscript } from '../application/queries/get-manuscript'
import type { ManuscriptSettings } from '../domain/manuscript-settings'
import { createMarkdownManuscriptRepository } from './markdown-manuscript-repository'

let copy: SampleNovelCopy
const p = (value: string): ProjectPath => value as ProjectPath
const text = (path: string): Promise<string> =>
  readFile(join(copy.root, ...path.split('/')), 'utf8')
const settings: ManuscriptSettings = {
  readOnly: false,
  partFolder: p('manuscript'),
  chapterFolder: p('manuscript'),
  fileNames: 'ask'
}

beforeEach(async () => {
  copy = await copySampleNovel()
})

afterEach(async () => {
  await copy.remove()
})

describe('fixing warnings on disk', () => {
  it('offers and applies a folder for an ambiguous prose link, nothing else changing', async () => {
    const repository = createMarkdownManuscriptRepository(copy.root)
    const ferry = 'manuscript/Part One/The Ferry.md'
    const view = await createGetManuscript({ repository })()
    const warning = view.manuscript.warnings.find(
      (candidate) => candidate.code === 'ambiguous-link' && candidate.paths[0] === ferry
    )
    expect(warning?.fix).toEqual({
      kind: 'path-form',
      name: 'Marrow',
      choices: ['characters/Marrow.md', 'locations/Marrow.md']
    })

    const before = await text(ferry)
    const fixed = await createFixWarning({ repository, settings })(p(ferry), {
      kind: 'path-form',
      name: 'Marrow',
      choice: p('locations/Marrow.md')
    })
    expect(fixed).toMatchObject({ ok: true })
    // The location key already means the place (its type settles it), so only prose changes.
    expect(await text(ferry)).toBe(
      before
        .replace('at [[Marrow]] while', 'at [[locations/Marrow|Marrow]] while')
        .replace('![[Marrow#Mill]]', '![[locations/Marrow#Mill]]')
    )
  })

  it('puts an unquoted link in quotes', async () => {
    const repository = createMarkdownManuscriptRepository(copy.root)
    const shapes = 'manuscript/Part Two/Shapes.md'
    const before = await text(shapes)
    expect(
      await createFixWarning({ repository, settings })(p(shapes), { kind: 'quote', key: 'pov' })
    ).toMatchObject({ ok: true })
    expect(await text(shapes)).toBe(before.replace('pov: [[Ilka Szabó]]', 'pov: "[[Ilka Szabó]]"'))
  })
})
