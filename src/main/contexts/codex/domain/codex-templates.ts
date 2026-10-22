import type { CodexKind } from './codex-entry'

/**
 * What a new entry starts with when the project has no template file for its kind (see "Character
 * and location files" in docs/file-format.md): its headings, in the book's language. Only a
 * starting point: the app never reads it back.
 */
export function defaultTemplateText(headings: readonly string[]): string {
  return headings.map((heading) => `## ${heading}\n`).join('\n')
}

const OWN_KEY = /^(type|title)\s*:/u
const CONTINUATION = /^[ \t-]/u

/**
 * The text of a new codex file: `type` and `title`, then the template's other keys and its body.
 * The template is the project's file for this kind, or the default headings when there is none.
 */
export function newCodexText(
  kind: CodexKind,
  title: string,
  template: string | undefined,
  headings: readonly string[]
): string {
  const own = [`type: ${kind}`, `title: ${JSON.stringify(title)}`]
  const { keys, body } = splitTemplate(
    (template ?? defaultTemplateText(headings)).replace(/\r\n/gu, '\n')
  )
  return ['---', ...own, ...keys, '---', body].join('\n')
}

/**
 * A template's frontmatter lines (without `type` or `title`, which the app sets) and its body.
 * A template without frontmatter is all body.
 */
function splitTemplate(template: string): { keys: string[]; body: string } {
  const lines = template.split('\n')
  if (lines[0] !== '---') return { keys: [], body: template }
  const close = lines.indexOf('---', 1)
  if (close === -1) return { keys: [], body: template }

  const keys: string[] = []
  let skipping = false
  for (const line of lines.slice(1, close)) {
    if (OWN_KEY.test(line)) skipping = true
    else if (!CONTINUATION.test(line) || line === '') skipping = false
    if (!skipping) keys.push(line)
  }
  return { keys, body: lines.slice(close + 1).join('\n') }
}
