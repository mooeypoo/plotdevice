import { describe, expect, it } from 'vitest'
import type { ProjectPath } from '../../../shared-kernel/project-path'
import { orderChanges, placeAt, samePaths } from './order-plan'

const p = (value: string): ProjectPath => value as ProjectPath
const a = { path: p('a'), order: 1 }
const b = { path: p('b'), order: 2 }
const c = { path: p('c'), order: 3 }

describe('orderChanges', () => {
  it('writes only the orders that differ', () => {
    expect(orderChanges([a, c, b])).toEqual([
      { path: 'c', order: 2 },
      { path: 'b', order: 3 }
    ])
    expect(orderChanges([a, b, c])).toEqual([])
  })

  it('numbers entries with gaps or no order', () => {
    expect(orderChanges([{ path: p('x'), order: 10 }, { path: p('y') }])).toEqual([
      { path: 'x', order: 1 },
      { path: 'y', order: 2 }
    ])
  })
})

describe('placeAt', () => {
  it('moves an entry to a position, clamping to the ends', () => {
    expect(placeAt([a, b, c], c, 0).map((e) => e.path)).toEqual(['c', 'a', 'b'])
    expect(placeAt([a, b, c], a, 99).map((e) => e.path)).toEqual(['b', 'c', 'a'])
  })

  it('inserts an entry that wasn’t in the sequence', () => {
    const added: { path: ProjectPath; order?: number } = { path: p('new') }
    expect(
      placeAt<{ path: ProjectPath; order?: number }>([a, b], added, 1).map((e) => e.path)
    ).toEqual(['a', 'new', 'b'])
  })
})

describe('samePaths', () => {
  it('accepts a reordering of the same entries only', () => {
    expect(samePaths([a, b, c], [p('c'), p('a'), p('b')])).toBe(true)
    expect(samePaths([a, b, c], [p('a'), p('b')])).toBe(false)
    expect(samePaths([a, b], [p('a'), p('a')])).toBe(false)
    expect(samePaths([a, b], [p('a'), p('z')])).toBe(false)
  })
})
