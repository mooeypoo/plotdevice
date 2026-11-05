import type { ProjectPath, Result } from '@plotdevice/shared'
import type { OutlineItemView } from './outline'

/**
 * A section's line-up, resolved against the book's outlines (ADR 0012): the section it points to, or
 * `missing` when that outline or section isn't there. `text` is the link's text as written.
 */
export type TimelineLineUpView =
  | { kind: 'section'; outline: ProjectPath; section: number; text: string }
  | { kind: 'missing'; outline: ProjectPath; anchor: string; text: string }

export interface TimelineSectionView {
  /** `null` for cards before the first section. */
  name: string | null
  /** The heading's anchor, which a line-up to this section links to; `null` for cards before the first section. */
  anchor: string | null
  items: OutlineItemView[]
  lineUp: TimelineLineUpView | null
}

/** One storyline: an outline, as the timeline reads it. */
export interface TimelineThreadView {
  file: ProjectPath
  title: string | null
  sections: TimelineSectionView[]
}

/** The book's outlines for the timeline, the main outline first; `main` is `null` only without outlines. */
export interface TimelineView {
  main: ProjectPath | null
  threads: TimelineThreadView[]
}

export type TimelineResult = Result<TimelineView, 'no-project'>
