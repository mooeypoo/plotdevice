import type { OutlineItemView, TimelineView } from '@plotdevice/contracts'
import type { ProjectPath } from '@plotdevice/shared'

/**
 * - `main`: a section of the main outline.
 * - `lined-up`: shares its moment with a section of another storyline.
 * - `not-lined-up`: sits between its neighbours, drawn lighter.
 * - `missing`, `contradicts`: its line-up points to a section that is gone, or against the order of a
 *   storyline: "can't line up". It sits where it would if it weren't lined up.
 */
export type TimelineCellState = 'main' | 'lined-up' | 'not-lined-up' | 'missing' | 'contradicts'

export interface TimelineColumn {
  /** Stable while the outlines don't change, for keys and focus. */
  key: string
  /** The main outline's section this column is, or `null` for an untitled gap. */
  main: number | null
  /** The column's name: the main outline's section heading; `null` for a gap and for cards before the first section. */
  title: string | null
}

export interface TimelineCell {
  /** The section's index in its outline. */
  section: number
  column: number
  /** `null` for cards before the first section. */
  name: string | null
  state: TimelineCellState
  items: OutlineItemView[]
}

export interface TimelineRow {
  file: ProjectPath
  title: string | null
  isMain: boolean
  /** One per section, in the outline's order (and so in column order). */
  cells: TimelineCell[]
}

export interface TimelineGrid {
  /** In time order: the reading-start side first. */
  columns: TimelineColumn[]
  rows: TimelineRow[]
}

/**
 * The timeline (ADR 0012): one row per storyline, the main outline's sections as named columns. A
 * section lined up with another, directly or through a chain, shares its column; the rest keep their
 * order and sit in untitled gaps as early as their order allows, sharing a gap with other storylines'
 * sections where they can. A line-up that would break a storyline's order, or put two of its sections
 * at one moment, is reported, never resolved by guessing. Hidden storylines still line others up.
 */
export function timelineGrid(view: TimelineView, hidden: ReadonlySet<ProjectPath> = new Set()): TimelineGrid {
  const threads = [...view.threads].sort((a, b) => Number(b.file === view.main) - Number(a.file === view.main))
  if (threads.length === 0) return { columns: [], rows: [] }
  const threadIndex = new Map(threads.map((thread, index) => [thread.file, index]))

  // One node per section; nodes that happen at the same moment are joined into one group.
  const nodes: { thread: number; section: number }[] = []
  const nodeOf = threads.map((thread, t) => thread.sections.map((_, s) => nodes.push({ thread: t, section: s }) - 1))
  const parent = nodes.map((_, i) => i)
  const members = new Map(nodes.map((_, i) => [i, [i]]))
  const find = (i: number): number => {
    let root = i
    while (parent[root] !== root) root = parent[root] ?? root
    while (parent[i] !== root) [parent[i], i] = [root, parent[i] ?? root]
    return root
  }
  /** Whether group `to` comes after group `from` in some storyline's order, directly or through others. */
  const reaches = (from: number, to: number): boolean => {
    const seen = new Set([from])
    const stack = [from]
    for (let g = stack.pop(); g !== undefined; g = stack.pop())
      for (const i of members.get(g) ?? []) {
        const node = nodes[i]
        const next = node && nodeOf[node.thread]?.[node.section + 1]
        if (next === undefined) continue
        const group = find(next)
        if (group === to) return true
        if (seen.has(group)) continue
        seen.add(group)
        stack.push(group)
      }
    return false
  }
  const threadsOf = (g: number) => (members.get(g) ?? []).map((i) => nodes[i]?.thread)
  const state = new Map<number, TimelineCellState>()

  for (const [t, thread] of threads.entries()) {
    for (const [s, section] of thread.sections.entries()) {
      const lineUp = section.lineUp
      if (!lineUp) continue
      const node = nodeOf[t]?.[s] ?? -1
      const target = lineUp.kind === 'section' ? nodeOf[threadIndex.get(lineUp.outline) ?? -1]?.[lineUp.section] : undefined
      if (target === undefined) {
        state.set(node, 'missing')
        continue
      }
      const [a, b] = [find(node), find(target)]
      if (a === b) continue // already at the same moment, through a chain
      // Two sections of one storyline at one moment, or one moment both before and after another.
      const own = new Set(threadsOf(a))
      if (threadsOf(b).some((thread) => own.has(thread)) || reaches(a, b) || reaches(b, a)) {
        state.set(node, 'contradicts')
        continue
      }
      parent[a] = b
      members.set(b, [...(members.get(b) ?? []), ...(members.get(a) ?? [])])
      members.delete(a)
    }
  }

  // Groups in time order: whatever a storyline's order allows next, gaps before the next main section.
  const groups = members
  const after = new Map<number, Set<number>>()
  const waiting = new Map<number, number>([...groups.keys()].map((g) => [g, 0]))
  for (const ids of nodeOf)
    for (let s = 1; s < ids.length; s++) {
      const [from, to] = [find(ids[s - 1] ?? 0), find(ids[s] ?? 0)]
      const next = after.get(from) ?? new Set<number>()
      if (!next.has(to)) waiting.set(to, (waiting.get(to) ?? 0) + 1)
      after.set(from, next.add(to))
    }
  const isMainGroup = (g: number) => (groups.get(g) ?? []).some((i) => nodes[i]?.thread === 0)
  const firstNode = (g: number) => Math.min(...(groups.get(g) ?? []))
  const columnOf = new Map<number, number>()
  const columns: { main: number | null; groups: number[] }[] = []
  const emit = (column: { main: number | null; groups: number[] }) => {
    for (const g of column.groups) {
      columnOf.set(g, columns.length)
      for (const next of after.get(g) ?? []) waiting.set(next, (waiting.get(next) ?? 0) - 1)
      waiting.delete(g)
    }
    columns.push(column)
  }
  while (waiting.size > 0) {
    const ready = [...waiting].filter(([, count]) => count === 0).map(([g]) => g)
    const gaps = ready.filter((g) => !isMainGroup(g)).sort((a, b) => firstNode(a) - firstNode(b))
    if (gaps.length > 0) {
      const used = new Set<number>()
      const packed = gaps.filter((g) => {
        const own = (groups.get(g) ?? []).map((i) => nodes[i]?.thread ?? -1)
        if (own.some((thread) => used.has(thread))) return false
        own.forEach((thread) => used.add(thread))
        return true
      })
      emit({ main: null, groups: packed })
    } else {
      const g = ready[0]
      if (g === undefined) break // only a cycle, which the line-ups above never leave
      emit({ main: nodes[(groups.get(g) ?? []).find((i) => nodes[i]?.thread === 0) ?? -1]?.section ?? null, groups: [g] })
    }
  }

  // Hidden storylines' rows go, and so do gaps that only they had.
  const visible = threads.map((thread) => !hidden.has(thread.file))
  const shown = columns.map(
    (column) => column.main !== null || column.groups.some((g) => (groups.get(g) ?? []).some((i) => visible[nodes[i]?.thread ?? -1])),
  )
  const newIndex = shown.reduce<number[]>((list, keep, i) => [...list, (list[i - 1] ?? -1) + (keep ? 1 : 0)], [])
  let gapCount = 0
  return {
    columns: columns.flatMap((column, i) =>
      shown[i]
        ? [
            {
              key: column.main === null ? `g${gapCount++}` : `m${column.main}`,
              main: column.main,
              title: column.main === null ? null : (threads[0]?.sections[column.main]?.name ?? null),
            },
          ]
        : [],
    ),
    rows: threads.flatMap((thread, t) =>
      visible[t]
        ? [
            {
              file: thread.file,
              title: thread.title,
              isMain: t === 0,
              cells: thread.sections.map((section, s): TimelineCell => {
                const node = nodeOf[t]?.[s] ?? 0
                const group = find(node)
                const together = (groups.get(group)?.length ?? 1) > 1
                return {
                  section: s,
                  column: newIndex[columnOf.get(group) ?? 0] ?? 0,
                  name: section.name,
                  state: state.get(node) ?? (t === 0 ? 'main' : together ? 'lined-up' : 'not-lined-up'),
                  items: section.items,
                }
              }),
            },
          ]
        : [],
    ),
  }
}
