import { describe, expect, it } from 'vitest'
import { contentsChangeSchema, openProjectSchema, projectPathSchema } from './project'
import { saveChapterSchema } from './chapter'

describe('project requests on the wire', () => {
  it.each(['manuscript/frost.md', 'manuscript/כפור.md'])('accepts the project path %s', (path) => {
    expect(projectPathSchema.safeParse(path).success).toBe(true)
  })

  it.each(['../outside.md', '/etc/passwd', 'C:/Windows/win.ini', 'manuscript\\frost.md', 'manuscript/con.md', ''])('rejects the path %s', (path) => {
    expect(projectPathSchema.safeParse(path).success).toBe(false)
  })

  it('accepts each kind of contents change, and nothing extra', () => {
    expect(contentsChangeSchema.safeParse({ kind: 'move-chapter', file: 'manuscript/frost.md', placement: { part: 0, index: 2 } }).success).toBe(true)
    expect(contentsChangeSchema.safeParse({ kind: 'add-chapter', title: 'Frost', placement: { part: null, index: 0 } }).success).toBe(true)
    expect(contentsChangeSchema.safeParse({ kind: 'move-chapter', file: 'manuscript/frost.md', placement: { part: -1, index: 0 } }).success).toBe(false)
    expect(contentsChangeSchema.safeParse({ kind: 'add-chapter', title: 'Frost', placement: { part: null, index: 0 }, text: 'smuggled' }).success).toBe(false)
    expect(contentsChangeSchema.safeParse({ kind: 'delete-everything' }).success).toBe(false)
  })

  it('opens a project only by choosing it or from the recent list', () => {
    expect(openProjectSchema.safeParse('choose').success).toBe(true)
    expect(openProjectSchema.safeParse({ recent: '/books/orchard' }).success).toBe(true)
    expect(openProjectSchema.safeParse({ root: '/books/orchard' }).success).toBe(false)
  })

  it('saves Hebrew and English text with its generation', () => {
    expect(saveChapterSchema.safeParse({ file: 'manuscript/frost.md', text: 'יעל said hello.\n', generation: 1 }).success).toBe(true)
    expect(saveChapterSchema.safeParse({ file: 'manuscript/frost.md', text: 'x', generation: 0 }).success).toBe(false)
    expect(saveChapterSchema.safeParse({ file: 'manuscript/frost.md', text: 5, generation: 1 }).success).toBe(false)
  })
})
