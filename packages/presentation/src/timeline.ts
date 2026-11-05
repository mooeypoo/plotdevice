import type { ChapterRef, OutlineItemView, TimelineThreadView, TimelineView } from '@plotdevice/contracts'
import { resolveRelative, type ProjectPath } from '@plotdevice/shared'
import { inlineSpans } from './outline-views'

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
  const threads = inMainOrder(view)
  if (threads.length === 0) return { columns: [], rows: [] }
  const { nodes, nodeOf, find, members, state } = groupSections(threads)

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

/**
 * The chapters a card links to, in the book's reading order: the timeline's chips, so where each event
 * is told shows at a glance (ADR 0012, decision 7). Links are read from the card's own line, relative
 * to `outlines/`; links to anything else, or to chapters not in the book, give no chip.
 */
export function chapterChips(cardText: string, chapters: readonly ChapterRef[]): ChapterRef[] {
  const linked = new Set<string>()
  for (const span of inlineSpans(cardText)) {
    if (span.kind !== 'link') continue
    const raw = span.target.replace(/^<|>$/g, '').split('#')[0] ?? ''
    let path: string | null = null
    try {
      path = resolveRelative('outlines', decodeURI(raw))
    } catch {
      continue
    }
    if (path) linked.add(path)
  }
  return chapters.filter((chapter) => linked.has(chapter.file))
}

/** The main outline first, then the rest in the order given. */
function inMainOrder(view: TimelineView): TimelineThreadView[] {
  return [...view.threads].sort((a, b) => Number(b.file === view.main) - Number(a.file === view.main))
}

/**
 * Joins the sections that happen at the same moment, line-up by line-up in the storylines' order,
 * refusing any that would break a storyline's order or put two of its sections at one moment.
 * `skip`: a section whose own line-up is left out, to ask where else it could go.
 */
function groupSections(threads: readonly TimelineThreadView[], skip?: { thread: number; section: number }) {
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
      if (!lineUp || (skip?.thread === t && skip.section === s)) continue
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

  return { nodes, nodeOf, find, members, state, reaches, threadsOf }
}

/**
 * The sections the section `section` of `file` can be lined up with, as `file#section`: any named
 * section of another storyline that keeps every storyline's order, its own line-up left aside (so it
 * can move). Dragging highlights them; "Line up with…" offers only them.
 */
export function lineUpChoices(view: TimelineView, file: ProjectPath, section: number): Set<string> {
  const threads = inMainOrder(view)
  const thread = threads.findIndex((each) => each.file === file)
  const choices = new Set<string>()
  if (thread === -1 || !threads[thread]?.sections[section]) return choices
  const { nodes, nodeOf, find, members, threadsOf } = groupSections(threads, { thread, section })
  const own = find(nodeOf[thread]?.[section] ?? 0)
  // Everything after this moment, and everything before it, in some storyline's order.
  const walk = (step: 1 | -1): Set<number> => {
    const seen = new Set<number>()
    const stack = [own]
    for (let g = stack.pop(); g !== undefined; g = stack.pop())
      for (const i of members.get(g) ?? []) {
        const node = nodes[i]
        const next = node && nodeOf[node.thread]?.[node.section + step]
        if (next === undefined || seen.has(find(next))) continue
        seen.add(find(next))
        stack.push(find(next))
      }
    return seen
  }
  const after = walk(1)
  const before = walk(-1)
  const ownThreads = new Set(threadsOf(own))
  threads.forEach((other, t) => {
    if (t === thread) return
    other.sections.forEach((candidate, s) => {
      const group = find(nodeOf[t]?.[s] ?? 0)
      if (candidate.name === null || after.has(group) || before.has(group)) return
      if (group !== own && threadsOf(group).some((each) => ownThreads.has(each))) return
      choices.add(`${other.file}#${s}`)
    })
  })
  return choices
}
