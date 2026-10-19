import { describe, expect, it } from 'vitest'
import { accepts, dropRequest, slotAt, type DropSpot } from './binder-drop'

const chapters = (slot: number, part: string | null = 'One.md'): DropSpot => ({
  kind: 'chapters',
  part,
  paths: ['a.md', 'b.md', 'c.md'],
  slot
})

describe('slotAt', () => {
  it('picks the gap above or below the row', () => {
    expect(slotAt(2, 5, 32)).toBe(2)
    expect(slotAt(2, 20, 32)).toBe(3)
  })
})

describe('dropRequest', () => {
  it('counts the index among the other chapters when moving down', () => {
    expect(dropRequest({ kind: 'chapter', path: 'a.md' }, chapters(3))).toEqual({
      kind: 'move-chapter',
      path: 'a.md',
      destination: { part: 'One.md', index: 2 }
    })
    expect(dropRequest({ kind: 'chapter', path: 'c.md' }, chapters(0))).toEqual({
      kind: 'move-chapter',
      path: 'c.md',
      destination: { part: 'One.md', index: 0 }
    })
  })

  it('asks for nothing when dropped where it already is', () => {
    expect(dropRequest({ kind: 'chapter', path: 'b.md' }, chapters(1))).toBeUndefined()
    expect(dropRequest({ kind: 'chapter', path: 'b.md' }, chapters(2))).toBeUndefined()
  })

  it('moves a chapter from another part to the gap as shown', () => {
    expect(dropRequest({ kind: 'chapter', path: 'z.md' }, chapters(1, 'Two.md'))).toEqual({
      kind: 'move-chapter',
      path: 'z.md',
      destination: { part: 'Two.md', index: 1 }
    })
  })

  it('takes a chapter out of order on the tray', () => {
    expect(dropRequest({ kind: 'chapter', path: 'a.md' }, { kind: 'unordered' })).toEqual({
      kind: 'move-chapter',
      path: 'a.md',
      destination: null
    })
  })

  it('reorders parts, and keeps parts and chapters apart', () => {
    const parts: DropSpot = { kind: 'parts', paths: ['One.md', 'Two.md'], slot: 2 }
    expect(dropRequest({ kind: 'part', path: 'One.md' }, parts)).toEqual({
      kind: 'move-part',
      path: 'One.md',
      index: 1
    })
    expect(accepts({ kind: 'part', path: 'One.md' }, chapters(0))).toBe(false)
    expect(accepts({ kind: 'chapter', path: 'a.md' }, parts)).toBe(false)
    expect(dropRequest({ kind: 'part', path: 'One.md' }, { kind: 'unordered' })).toBeUndefined()
  })
})
