import { describe, expect, it } from 'vitest'
import { createReferenceSchema, referenceFileSchema, shelfSchema } from './references'

describe('reference requests on the wire', () => {
  it('reads pages in any folder but the book’s own (ADR 0011)', () => {
    expect(referenceFileSchema.safeParse({ file: 'characters/ilka.md' }).success).toBe(true)
    expect(referenceFileSchema.safeParse({ file: 'places/a/מרו.md' }).success).toBe(true)
    expect(referenceFileSchema.safeParse({ file: 'פלגים/הסוחרים.md' }).success).toBe(true)
    expect(referenceFileSchema.safeParse({ file: 'manuscript/frost.md' }).success).toBe(false)
    expect(referenceFileSchema.safeParse({ file: 'Outlines/main.md' }).success).toBe(false)
    expect(referenceFileSchema.safeParse({ file: 'project.md' }).success).toBe(false)
    expect(referenceFileSchema.safeParse({ file: '.git/x.md' }).success).toBe(false)
    expect(referenceFileSchema.safeParse({ file: 'characters/../project.md' }).success).toBe(false)
  })

  it('creates pages of a kind: one folder, never the book’s own', () => {
    expect(createReferenceSchema.safeParse({ kind: 'places', title: 'Marrow' }).success).toBe(true)
    expect(createReferenceSchema.safeParse({ kind: 'factions', title: 'The Salt Exchange' }).success).toBe(true)
    expect(createReferenceSchema.safeParse({ kind: 'manuscript', title: 'x' }).success).toBe(false)
    expect(createReferenceSchema.safeParse({ kind: 'a/b', title: 'x' }).success).toBe(false)
    expect(createReferenceSchema.safeParse({ kind: '..', title: 'x' }).success).toBe(false)
  })

  it('pins only pages', () => {
    expect(shelfSchema.safeParse({ files: ['characters/ilka.md', 'notes/salt.md'] }).success).toBe(true)
    expect(shelfSchema.safeParse({ files: ['outlines/main-story.md'] }).success).toBe(false)
  })
})
