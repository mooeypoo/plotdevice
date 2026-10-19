import type { CodexKind } from './codex-entry'

/** The title a new entry gets when the writer leaves the name empty. */
export const UNTITLED: Readonly<Record<CodexKind, string>> = {
  character: 'Unnamed character',
  location: 'Unnamed location',
  note: 'Untitled note'
}

/**
 * The headings a new entry starts with (see "Character and location files" in
 * docs/file-format.md). They only seed the file: the writer can change them, and the app never
 * reads them.
 */
const HEADINGS: Readonly<Record<CodexKind, readonly string[]>> = {
  character: ['Description', 'History', 'Arc'],
  location: ['Description', 'History'],
  note: []
}

/** The text of a new codex file: `type`, `title`, and the template's headings. */
export function newCodexText(kind: CodexKind, title: string): string {
  const body = HEADINGS[kind].map((heading) => `## ${heading}\n`).join('\n')
  return ['---', `type: ${kind}`, `title: ${JSON.stringify(title)}`, '---', body].join('\n')
}
