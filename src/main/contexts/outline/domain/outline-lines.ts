/** How a line ends: its own line break, or nothing for a last line without one. */
export type LineEnding = '\n' | '\r\n' | ''

/** One line of an outline's body, with the line break it was written with. */
export interface OutlineLine {
  readonly text: string
  readonly ending: LineEnding
}

/**
 * Splits a body into lines, each keeping its own ending, so joining them gives back the exact text.
 * An empty body has no lines; a trailing line break doesn't start another line.
 */
export function splitOutlineLines(body: string): OutlineLine[] {
  const lines: OutlineLine[] = []
  const pattern = /([^\n]*?)(\r\n|\n|$)/gu
  let position = 0
  while (position < body.length) {
    pattern.lastIndex = position
    const match = pattern.exec(body)
    if (match === null) break
    const [whole, text = '', ending = ''] = match
    lines.push({ text, ending: ending as LineEnding })
    position += whole.length
  }
  return lines
}

/** The text the lines were split from. */
export function joinOutlineLines(lines: readonly OutlineLine[]): string {
  return lines.map((line) => line.text + line.ending).join('')
}

/** The line break most of the body uses, for any line the app adds; LF when there is none. */
export function dominantEnding(lines: readonly OutlineLine[]): '\n' | '\r\n' {
  let crlf = 0
  let lf = 0
  for (const line of lines) {
    if (line.ending === '\r\n') crlf += 1
    else if (line.ending === '\n') lf += 1
  }
  return crlf > lf ? '\r\n' : '\n'
}
