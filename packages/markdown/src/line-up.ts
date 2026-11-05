import { dirnameOf, relativePath, resolveRelative, type ProjectPath } from '@plotdevice/shared'
import { codeRanges } from './links'
import type { TextRange } from './outline-model'

/** A section's line-up as written (ADR 0012), with where its paragraph and link are. */
export interface LineUpSource {
  outline: ProjectPath
  /** The `#` part, decoded. */
  anchor: string
  /** The link's text as written. */
  text: string
  paragraph: TextRange
  /** The whole link, `[text](destination)`. */
  link: TextRange
}

const OUTLINES = 'outlines/'
const INLINE_LINK = /(!?)\[((?:\\.|[^\]\\\n])*)\]\((<[^>\n]*>|[^\s)]+)(?:[ \t]+"[^"\n]*")?\)/g

/**
 * The line-up of a section whose intro paragraphs are `intro`, in the outline at `file`: the first
 * paragraph with exactly one link to a section of another outline. Links to pages, chapters, the same
 * outline or a whole outline don't count, nor do images or links in code.
 */
export function readLineUp(source: string, intro: readonly TextRange[], file: ProjectPath): LineUpSource | null {
  for (const paragraph of intro) {
    const found = sectionLinks(source, paragraph, file)
    if (found.length === 1 && found[0]) return found[0]
  }
  return null
}

function sectionLinks(source: string, paragraph: TextRange, file: ProjectPath): LineUpSource[] {
  const text = source.slice(paragraph.start, paragraph.end)
  if (!text.includes('](')) return []
  const code = codeRanges(text)
  const found: LineUpSource[] = []
  for (const match of text.matchAll(INLINE_LINK)) {
    if (match[1] || code.some((range) => match.index >= range.start && match.index < range.end)) continue
    const target = sectionTarget(match[3] ?? '', file)
    if (!target) continue
    const start = paragraph.start + match.index
    found.push({ ...target, text: match[2] ?? '', paragraph, link: { start, end: start + match[0].length } })
  }
  return found
}

function sectionTarget(destination: string, file: ProjectPath): { outline: ProjectPath; anchor: string } | null {
  const raw = destination.startsWith('<') ? destination.slice(1, -1) : destination
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return null
  const hash = raw.indexOf('#')
  if (hash <= 0 || hash === raw.length - 1) return null
  let path: string | null
  let anchor: string
  try {
    path = resolveRelative(dirnameOf(file), decodeURI(raw.slice(0, hash)))
    anchor = decodeURIComponent(raw.slice(hash + 1))
  } catch {
    return null
  }
  if (path === null || !path.startsWith(OUTLINES) || !/\.md$/i.test(path) || path === file) return null
  return { outline: path as ProjectPath, anchor }
}

/** The link the app writes: `[The night of the storm](main-story.md#the-night-of-the-storm)`. */
export function lineUpLink(lineUp: { outline: string; anchor: string; text: string }, file: ProjectPath): string {
  const destination = `${relativePath(dirnameOf(file), lineUp.outline)}#${lineUp.anchor}`
  const text = lineUp.text.replace(/[\\[\]]/g, (char) => `\\${char}`)
  return `[${text}](${/[\s<>()]/.test(destination) ? `<${destination}>` : destination})`
}
