import { describe, expect, it } from 'vitest'
import { editOutline } from './edit-outline'
import type { OutlineEdit, OutlineItemSource } from './outline-model'
import { applyToShape, fixture, fixtureNames, pathOfId, seededRandom, shapeOf, uniformFixtures, withoutIds, type ItemShape, type OutlineShape } from './outline.test-support'
import { readOutline } from './read-outline'

const MOVES = 300

interface Container {
  section: number
  parentPath: number[]
  parentId: number | null
  items: ItemShape[]
}

function containers(shape: OutlineShape): Container[] {
  const found: Container[] = []
  const visit = (items: ItemShape[], section: number, parentPath: number[], parentId: number | null): void => {
    found.push({ section, parentPath, parentId, items })
    for (const [index, item] of items.entries()) visit(item.children, section, [...parentPath, index], item.id ?? null)
  }
  for (const [section, { items }] of shape.sections.entries()) visit(items, section, [], null)
  return found
}

function sourceAt(items: OutlineItemSource[], path: number[]): OutlineItemSource | undefined {
  let item: OutlineItemSource | undefined
  for (const index of path) {
    item = items[index]
    items = item?.children ?? []
  }
  return item
}

const containsId = (item: ItemShape, id: number): boolean => item.id === id || item.children.some((child) => containsId(child, id))

function apply(source: string, edit: OutlineEdit, nestingUnit: string): string {
  const result = editOutline(source, edit, { nestingUnit })
  if (!result.ok) throw new Error(`refused ${JSON.stringify(edit)}: ${result.error}`)
  return result.value
}

// Each walk is deterministic and bounded, but takes a few seconds when the whole suite runs at once.
const WALK_TIMEOUT_MS = 30_000

describe.each(fixtureNames)('%s: seeded random moves, then their reversals', (name) => {
  it('matches the model at every step and restores the original', { timeout: WALK_TIMEOUT_MS }, () => {
    const original = fixture(name)
    const random = seededRandom(name.length * 7919)
    const oracle = shapeOf(readOutline(original), true)
    const nestingUnit = readOutline(original).nestingUnit ?? '  ' // the style the app remembers on opening
    const inverses: OutlineEdit[] = []
    let text = original

    for (let step = 0; step < MOVES; step++) {
      const parsed = readOutline(text)
      const all = containers(oracle)
      const from = all[random(all.length)]
      if (!from || from.items.length === 0) continue
      const index = random(from.items.length)
      const moving = from.items[index]
      if (!moving || moving.id === undefined || !sourceAt(parsed.sections[from.section]?.items ?? [], [...from.parentPath, index])?.movable) continue
      // Emptying the unnamed section removes it, and no move can bring it back: keep the walk reversible.
      if (oracle.sections[from.section]?.heading === null && from.parentPath.length === 0 && from.items.length === 1) continue

      const targets = all.filter((c) => c.parentId === null || !containsId(moving, c.parentId))
      const target = targets[random(targets.length)]
      if (!target) continue
      if (target.parentPath.length > 0 && !sourceAt(parsed.sections[target.section]?.items ?? [], target.parentPath)?.movable) continue
      const siblings = target.items.filter((item) => item !== moving).length
      const edit: OutlineEdit = {
        kind: 'move-item',
        from: { section: from.section, path: [...from.parentPath, index] },
        to: { section: target.section, parentPath: target.parentPath, index: random(siblings + 1) },
      }

      text = apply(text, edit, nestingUnit)
      applyToShape(oracle, edit)
      expect(withoutIds(shapeOf(readOutline(text)))).toEqual(withoutIds(oracle))

      const movedTo = pathOfId(oracle, moving.id)
      const parentPath = from.parentId === null ? [] : pathOfId(oracle, from.parentId)?.path
      if (!movedTo || !parentPath) throw new Error('lost track of an item')
      inverses.push({ kind: 'move-item', from: movedTo, to: { section: from.section, parentPath, index } })
    }

    expect(inverses.length).toBeGreaterThan(MOVES / 10)
    for (const edit of inverses.reverse()) {
      text = apply(text, edit, nestingUnit)
      applyToShape(oracle, edit)
      expect(withoutIds(shapeOf(readOutline(text)))).toEqual(withoutIds(oracle))
    }

    expect(withoutIds(shapeOf(readOutline(text)))).toEqual(withoutIds(shapeOf(readOutline(original))))
    // The others differ for documented reasons: a moved card takes its new list's marker and spacing (Spike A).
    if (uniformFixtures.includes(name)) expect(text).toBe(original)
  })
})
