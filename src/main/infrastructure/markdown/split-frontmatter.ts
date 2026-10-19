/** A markdown file split into its parts (see "Frontmatter" in docs/file-format.md). */
export type FrontmatterSplit =
  | {
      readonly kind: 'frontmatter'
      readonly hasBom: boolean
      /** The YAML between the `---` lines, with its original line endings. */
      readonly yaml: string
      /** Where the body starts in the decoded text (after the BOM and the closing `---` line). */
      readonly bodyStart: number
      readonly text: string
    }
  | { readonly kind: 'none'; readonly hasBom: boolean; readonly text: string }
  | { readonly kind: 'unclosed'; readonly hasBom: boolean; readonly text: string }
  | { readonly kind: 'invalid-encoding' }

const BOM = '﻿'
const utf8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })

/** Splits a file's bytes into frontmatter and body without changing anything. */
export function splitFrontmatter(bytes: Uint8Array): FrontmatterSplit {
  let text: string
  try {
    text = utf8.decode(bytes)
  } catch {
    return { kind: 'invalid-encoding' }
  }

  const hasBom = text.startsWith(BOM)
  const start = hasBom ? BOM.length : 0
  const firstLineEnd = lineEndAt(text, start)
  if (firstLineEnd === undefined || text.slice(start, firstLineEnd.contentEnd) !== '---') {
    return { kind: 'none', hasBom, text }
  }

  const yamlStart = firstLineEnd.nextLine
  let lineStart = yamlStart
  while (lineStart <= text.length) {
    const line = lineEndAt(text, lineStart)
    const contentEnd = line?.contentEnd ?? text.length
    if (text.slice(lineStart, contentEnd) === '---') {
      return {
        kind: 'frontmatter',
        hasBom,
        yaml: text.slice(yamlStart, lineStart),
        bodyStart: line?.nextLine ?? text.length,
        text
      }
    }
    if (line === undefined) break
    lineStart = line.nextLine
  }
  return { kind: 'unclosed', hasBom, text }
}

/** The end of the line starting at `from`, or `undefined` if it runs to the end of the text. */
function lineEndAt(
  text: string,
  from: number
): { readonly contentEnd: number; readonly nextLine: number } | undefined {
  const newline = text.indexOf('\n', from)
  if (newline === -1) return undefined
  const contentEnd = newline > from && text[newline - 1] === '\r' ? newline - 1 : newline
  return { contentEnd, nextLine: newline + 1 }
}
