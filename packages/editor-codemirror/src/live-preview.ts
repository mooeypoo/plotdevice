import { syntaxTree } from '@codemirror/language'
import type { EditorState, Range } from '@codemirror/state'
import { Decoration, EditorView, ViewPlugin, WidgetType, type DecorationSet, type ViewUpdate } from '@codemirror/view'
import { hiddenIn, KEPT, pendingFormat, type Hidden } from './hidden'
import { editorSettings } from './settings'

/**
 * Rendered editing (ADR 0010): the author sees formatted text and never a Markdown mark, on every
 * line, the cursor's too. What is hidden comes from `hidden.ts`; this only draws it. Nothing here
 * changes the text.
 */

/** What is drawn instead of hidden text: a bullet, a list number, ⁂, a wikilink's name. */
class Shown extends WidgetType {
  constructor(
    readonly text: string,
    readonly className: string,
    readonly label: string | null,
    readonly indent: number,
  ) {
    super()
  }
  override eq(other: Shown): boolean {
    return other.text === this.text && other.className === this.className && other.label === this.label && other.indent === this.indent
  }
  toDOM(): HTMLElement {
    const element = document.createElement('span')
    element.className = this.className
    element.textContent = this.text
    // Indentation is drawn, not typed: CSSOM styles need no Content Security Policy exception.
    if (this.indent > 0) element.style.paddingInlineStart = `${this.indent}ch`
    if (this.label === null) element.setAttribute('aria-hidden', 'true')
    else if (this.label !== this.text) {
      element.setAttribute('role', 'img')
      element.setAttribute('aria-label', this.label)
    }
    return element
  }
}

const hide = Decoration.replace({})
const linkWords = Decoration.mark({ class: 'cm-link', attributes: { dir: 'auto' }, bidiIsolate: null })

function shown(h: Hidden, sceneBreak: string): Decoration {
  if (h.kind === 'whole' && h.shows === '⁂') return Decoration.replace({ widget: new Shown('⁂', 'cm-scene-break', sceneBreak, 0) })
  if (h.kind === 'whole') return Decoration.replace({ widget: new Shown(h.shows ?? '', 'cm-link', h.shows ?? '', 0) })
  const bullet = h.shows === '•'
  return Decoration.replace({
    widget: new Shown(bullet ? '•' : (h.shows ?? ''), 'cm-list-mark', bullet ? null : (h.shows ?? ''), h.indent ?? 0),
  })
}

/** The hidden ranges drawn: replaced, or drawn as something else; and the words of each link. */
export function decorationsFor(
  hidden: readonly Hidden[],
  sceneBreak: string,
): { all: Range<Decoration>[]; atomic: Range<Decoration>[]; links: Range<Decoration>[] } {
  const atomic: Range<Decoration>[] = []
  const links: Range<Decoration>[] = []
  const opens = new Map<number, Hidden>()
  for (const h of hidden) {
    if (h.to > h.from) atomic.push((h.shows === undefined ? hide : shown(h, sceneBreak)).range(h.from, h.to))
    if (h.kind === 'link-open') opens.set(h.group.from, h)
    const open = h.kind === 'link-close' ? opens.get(h.group.from) : undefined
    if (open && open.to < h.from) links.push(linkWords.range(open.to, h.from))
  }
  return { all: [...atomic, ...links], atomic, links }
}

/** Headings, quotes and "kept as written" passages, by line, from the parser. */
function lineStyles(state: EditorState, from: number, to: number): Range<Decoration>[] {
  const lines = new Map<number, { classes: Set<string>; level?: number }>()
  const add = (pos: number, className: string, level?: number): void => {
    const line = state.doc.lineAt(pos)
    const entry = lines.get(line.from) ?? { classes: new Set<string>() }
    entry.classes.add(className)
    if (level !== undefined) entry.level = level
    lines.set(line.from, entry)
  }
  const eachLine = (nodeFrom: number, nodeTo: number, className: string): void => {
    for (let pos = nodeFrom; pos <= nodeTo; pos = state.doc.lineAt(pos).to + 1) add(pos, className)
  }
  syntaxTree(state).iterate({
    from,
    to,
    enter: (node) => {
      const heading = /^ATXHeading(\d)$/.exec(node.name)
      if (heading) {
        const level = Number(heading[1])
        add(node.from, `cm-heading cm-h${level}`, level)
      }
      if (node.name === 'Blockquote') eachLine(node.from, node.to, 'cm-quote')
      if (KEPT.has(node.name)) {
        eachLine(node.from, node.to, 'cm-kept')
        return false
      }
      return undefined
    },
  })
  return [...lines].map(([pos, { classes, level }]) =>
    Decoration.line({
      class: [...classes].join(' '),
      // Announced as a heading of its level by screen readers.
      ...(level === undefined ? {} : { attributes: { role: 'heading', 'aria-level': String(level) } }),
    }).range(pos),
  )
}

class Preview {
  decorations: DecorationSet = Decoration.none
  atomic: DecorationSet = Decoration.none
  isolates: DecorationSet = Decoration.none

  constructor(view: EditorView) {
    this.build(view)
  }

  update(update: ViewUpdate): void {
    const changed =
      update.docChanged ||
      update.viewportChanged ||
      update.startState.facet(editorSettings) !== update.state.facet(editorSettings) ||
      update.startState.field(pendingFormat, false) !== update.state.field(pendingFormat, false) ||
      syntaxTree(update.startState) !== syntaxTree(update.state)
    if (changed) this.build(update.view)
  }

  build(view: EditorView): void {
    const { state } = view
    const sceneBreak = state.facet(editorSettings).labels.sceneBreak
    const all: Range<Decoration>[] = []
    const atomic: Range<Decoration>[] = []
    const links: Range<Decoration>[] = []
    for (const { from, to } of view.visibleRanges) {
      const drawn = decorationsFor(hiddenIn(state, from, to), sceneBreak)
      all.push(...drawn.all, ...lineStyles(state, from, to))
      atomic.push(...drawn.atomic)
      links.push(...drawn.links)
    }
    this.decorations = Decoration.set(all, true)
    this.atomic = Decoration.set(atomic, true)
    this.isolates = Decoration.set(links, true)
  }
}

export const livePreview = ViewPlugin.fromClass(Preview, {
  decorations: (preview) => preview.decorations,
  provide: (plugin) => [
    // The cursor steps over hidden marks whole, and link words are isolated so arrows follow their direction.
    EditorView.atomicRanges.of((view) => view.plugin(plugin)?.atomic ?? Decoration.none),
    EditorView.bidiIsolatedRanges.of((view) => view.plugin(plugin)?.isolates ?? Decoration.none),
  ],
})
