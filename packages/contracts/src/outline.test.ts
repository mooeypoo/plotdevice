import { describe, expect, it } from 'vitest'
import { editOutlineSchema, placeSchema } from './outline'

describe('outline requests on the wire', () => {
  it('accepts each edit, and nothing extra', () => {
    expect(editOutlineSchema.safeParse({ file: 'outlines/main-story.md', edit: { kind: 'move-item', from: { section: 0, path: [1, 0] }, to: { section: 1, parentPath: [], index: 0 } } }).success).toBe(true)
    expect(editOutlineSchema.safeParse({ file: 'outlines/main-story.md', edit: { kind: 'rename-item', at: { section: 0, path: [0] }, text: 'יעל 🍐' } }).success).toBe(true)
    expect(editOutlineSchema.safeParse({ file: 'outlines/main-story.md', edit: { kind: 'delete-item', at: { section: 0, path: [] } } }).success).toBe(false)
    expect(editOutlineSchema.safeParse({ file: 'outlines/main-story.md', edit: { kind: 'set-title', text: 'x', extra: 1 } }).success).toBe(false)
  })

  it('edits only files in the outlines folder', () => {
    const edit = { kind: 'set-title', text: 'x' }
    expect(editOutlineSchema.safeParse({ file: 'manuscript/frost.md', edit }).success).toBe(false)
    expect(editOutlineSchema.safeParse({ file: 'outlines/../project.md', edit }).success).toBe(false)
    expect(editOutlineSchema.safeParse({ file: 'outlines/plan.txt', edit }).success).toBe(false)
  })

  it('remembers the workspace by its internal ID, never by its name', () => {
    expect(placeSchema.safeParse({ workspace: 'story', outline: 'outlines/main-story.md', view: 'board' }).success).toBe(true)
    expect(placeSchema.safeParse({ workspace: 'Story' }).success).toBe(false)
  })
})
