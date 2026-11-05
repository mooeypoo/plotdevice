import type { Outline } from './outline'

/**
 * A heading's anchor, by the common heading-slug rule (GitHub's): lowercase, punctuation removed,
 * each space a `-`. Letters of any script, their marks (nikkud, accents) and digits are kept.
 */
export function headingAnchor(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-')
}

/** Each section's anchor, `null` for the unnamed one; a repeated heading gets `-1`, `-2`, … */
export function sectionAnchors(outline: Outline): (string | null)[] {
  const seen = new Map<string, number>()
  return outline.sections.map((section) => {
    if (section.name === null) return null
    const base = headingAnchor(section.name)
    const count = seen.get(base) ?? 0
    seen.set(base, count + 1)
    return count === 0 ? base : `${base}-${count}`
  })
}

/** The index of the section `anchor` points to: by anchor, or by heading text; `null` if none does. */
export function lineUpTarget(outline: Outline, anchor: string): number | null {
  const wanted = decoded(anchor).trim().toLowerCase()
  if (wanted === '') return null
  const byAnchor = sectionAnchors(outline).indexOf(wanted)
  if (byAnchor !== -1) return byAnchor
  const byName = outline.sections.findIndex((section) => section.name?.trim().toLowerCase() === wanted)
  return byName === -1 ? null : byName
}

function decoded(text: string): string {
  try {
    return decodeURIComponent(text)
  } catch {
    return text
  }
}
