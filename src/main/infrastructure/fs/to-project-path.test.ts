import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { toProjectPath } from './to-project-path'

const root = resolve('/novels/salt-orchard')

describe('toProjectPath', () => {
  it('converts a path inside the project, with forward slashes on every OS', () => {
    expect(toProjectPath(root, join(root, 'manuscript', 'Part One', 'The Ferry.md'))).toEqual({
      ok: true,
      value: 'manuscript/Part One/The Ferry.md'
    })
  })

  it('accepts a file whose name starts with two dots', () => {
    expect(toProjectPath(root, join(root, '..draft.md'))).toEqual({ ok: true, value: '..draft.md' })
  })

  it.each([
    ['the root itself', root],
    ['the parent', resolve(root, '..')],
    ['a sibling project', resolve(root, '..', 'other', 'novel.md')],
    ['an unrelated folder', resolve('/etc/passwd')]
  ])('rejects %s', (_, path) => {
    expect(toProjectPath(root, path)).toMatchObject({
      ok: false,
      error: { code: 'outside-project' }
    })
  })
})
