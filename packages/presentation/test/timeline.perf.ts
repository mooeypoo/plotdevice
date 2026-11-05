import type { TimelineThreadView, TimelineView } from '@plotdevice/contracts'
import type { ProjectPath } from '@plotdevice/shared'
import { describe, expect, it } from 'vitest'
import { timelineGrid } from '../src/index'

// The timeline's budget (Milestone 21): a long book of 12 storylines with 60 moments each and 300
// cards, nearly every moment lined up, is laid out again on every outline change. CI allows twice.
const SLACK = process.env.CI ? 2 : 1
const LIMIT = 50

function longBook(): TimelineView {
  const files = Array.from({ length: 12 }, (_, t) => `outlines/storyline-${t}.md` as ProjectPath)
  const threads = files.map((file, t): TimelineThreadView => ({
    file,
    title: `Storyline ${t}`,
    sections: Array.from({ length: 60 }, (_, s) => ({
      name: `Moment ${s}`,
      anchor: `moment-${s}`,
      items: Array.from({ length: (t * 60 + s) % 12 === 0 ? 5 : 0 }, (_, c) => ({
        text: `Card ${c}`,
        checked: null,
        children: [],
        keptAsWritten: [],
        movable: true,
      })),
      // Each storyline lines up with the one before it, so most line-ups reach the main outline by a chain.
      lineUp: t > 0 && s % 3 !== 2 ? { kind: 'section' as const, outline: files[t - 1] as ProjectPath, section: s, text: '' } : null,
    })),
  }))
  return { main: files[0] ?? null, threads }
}

describe('timeline performance', () => {
  it(`lays out 12 storylines, 60 moments and 300 cards within ${LIMIT} ms`, () => {
    const book = longBook()
    expect(book.threads.flatMap((thread) => thread.sections).reduce((sum, section) => sum + section.items.length, 0)).toBe(300)
    const times: number[] = []
    for (let run = 0; run < 5; run++) {
      const start = performance.now()
      const grid = timelineGrid(book)
      times.push(performance.now() - start)
      expect(grid.rows).toHaveLength(12)
    }
    expect(times.sort((a, b) => a - b)[2]).toBeLessThan(LIMIT * SLACK)
  })
})
