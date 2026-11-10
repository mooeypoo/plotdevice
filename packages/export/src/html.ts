import type { ExportBlock, ExportInline, TextDirection } from '@plotdevice/markdown'

/** Escapes text for XHTML content and attribute values. */
export function escapeXml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char)
}

/** Only web and email addresses become links; anything else (`javascript:`, files) stays text. */
export function safeUrl(url: string): string | null {
  return /^(https?:\/\/|mailto:)/i.test(url.trim()) ? url.trim() : null
}

const dirAttribute = (direction: TextDirection | undefined, around: TextDirection): string =>
  direction !== undefined && direction !== around ? ` dir="${direction}"` : ''

export function inlinesToHtml(inlines: readonly ExportInline[]): string {
  return inlines
    .map((inline) => {
      switch (inline.type) {
        case 'text':
          return escapeXml(inline.value)
        case 'emphasis':
          return `<em>${inlinesToHtml(inline.children)}</em>`
        case 'strong':
          return `<strong>${inlinesToHtml(inline.children)}</strong>`
        case 'break':
          return '<br/>'
        case 'span':
          // Always marked, even when it matches the paragraph: the author set it to isolate the phrase.
          return `<span dir="${inline.direction}">${inlinesToHtml(inline.children)}</span>`
        case 'link': {
          const url = safeUrl(inline.url)
          const text = inlinesToHtml(inline.children)
          return url === null ? text : `<a href="${escapeXml(url)}">${text}</a>`
        }
      }
    })
    .join('')
}

/** A stanza's lines, each its own block, so a line too long for the page carries on indented (ADR 0013). */
function stanzaLines(inlines: readonly ExportInline[]): string {
  const lines: ExportInline[][] = [[]]
  for (const inline of inlines) {
    if (inline.type === 'break') lines.push([])
    else lines.at(-1)?.push(inline)
  }
  return lines.map((line) => `<span class="line">${inlinesToHtml(line)}</span>`).join('')
}

/**
 * Blocks as XHTML. `around` is the direction of what holds them (the book, or a list or quote), so a
 * block says its own direction only when it differs. Headings inside a chapter sit `headingOffset`
 * levels below where the author wrote them, under the chapter's own heading, and never below `h6`.
 * In a poem, each paragraph is a stanza (ADR 0013).
 */
export function blocksToHtml(blocks: readonly ExportBlock[], around: TextDirection, headingOffset: number, poem = false): string {
  return blocks
    .map((block) => {
      switch (block.type) {
        case 'paragraph':
          return poem
            ? `<p class="stanza"${dirAttribute(block.direction, around)}>${stanzaLines(block.children)}</p>`
            : `<p${dirAttribute(block.direction, around)}>${inlinesToHtml(block.children)}</p>`
        case 'heading': {
          const level = Math.min(6, block.level + headingOffset)
          return `<h${level}${dirAttribute(block.direction, around)}>${inlinesToHtml(block.children)}</h${level}>`
        }
        case 'scene-break':
          return '<p class="scene-break" role="separator">* * *</p>'
        case 'quote': {
          const inner = block.direction ?? around
          return `<blockquote${dirAttribute(block.direction, around)}>${blocksToHtml(block.children, inner, headingOffset)}</blockquote>`
        }
        case 'list': {
          const inner = block.direction ?? around
          const tag = block.ordered ? 'ol' : 'ul'
          const start = block.ordered && block.start !== 1 ? ` start="${block.start}"` : ''
          const items = block.items.map((item) => `<li>${blocksToHtml(item, inner, headingOffset)}</li>`).join('')
          return `<${tag}${start}${dirAttribute(block.direction, around)}>${items}</${tag}>`
        }
      }
    })
    .join('\n')
}
