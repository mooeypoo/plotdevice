import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import type { Extension } from '@codemirror/state'
import { tags } from '@lezer/highlight'
import { caretKeymap, renderedRules } from './caret'
import { foldedSection, type FoldedSection } from './folded-section'
import { livePreview } from './live-preview'
import { directionHiding } from './paragraph-direction'

/** Bold and italics drawn as such; links are styled by their words (`cm-link`). */
const prose = HighlightStyle.define([
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: '700' },
  { tag: tags.heading, fontWeight: '650' },
])

export interface RenderedOptions {
  /** One nesting level as the file writes it; outlines pass their own (ADR 0003). */
  nestingUnit?: (text: string) => string
  /** A section shown elsewhere, folded into one line (a page's relationships). */
  foldedSection?: FoldedSection
}

/**
 * Rendered editing (ADR 0010): everything that makes the editor show what the text means. Plain text is
 * the same editor without this, so switching never remounts it or loses undo.
 */
export function rendered(options: RenderedOptions = {}): Extension {
  return [
    renderedRules(options.nestingUnit ? { nestingUnit: options.nestingUnit } : {}),
    caretKeymap,
    livePreview,
    directionHiding,
    syntaxHighlighting(prose),
    options.foldedSection ? foldedSection(options.foldedSection) : [],
  ]
}
