import { describe, expect, it } from 'vitest'
import { createReferenceSchema, referenceFileSchema, shelfSchema } from './references'

describe('reference requests on the wire', () => {
  it('reads only pages in the characters, places and notes folders', () => {
    expect(referenceFileSchema.safeParse({ file: 'characters/ilka.md' }).success).toBe(true)
    expect(referenceFileSchema.safeParse({ file: 'places/a/מרו.md' }).success).toBe(true)
    expect(referenceFileSchema.safeParse({ file: 'manuscript/frost.md' }).success).toBe(false)
    expect(referenceFileSchema.safeParse({ file: 'characters/../project.md' }).success).toBe(false)
  })

  it('creates only the three kinds', () => {
    expect(createReferenceSchema.safeParse({ kind: 'place', title: 'Marrow' }).success).toBe(true)
    expect(createReferenceSchema.safeParse({ kind: 'chapter', title: 'x' }).success).toBe(false)
  })

  it('pins only pages', () => {
    expect(shelfSchema.safeParse({ files: ['characters/ilka.md', 'notes/salt.md'] }).success).toBe(true)
    expect(shelfSchema.safeParse({ files: ['outlines/main-story.md'] }).success).toBe(false)
  })
})
