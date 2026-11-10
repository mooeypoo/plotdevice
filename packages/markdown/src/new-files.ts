import { formatScalar } from './frontmatter'

export interface NewProjectDetails {
  title: string
  author?: string
  language: string
  chapterNumbering: string
  id: string
  schemaVersion: number
}

/** A new `project.md`: details only; the body is the author's (DOMAIN_AND_FILE_FORMAT.md). */
export function newProjectFile(details: NewProjectDetails): string {
  const lines = [
    `title: ${formatScalar(details.title)}`,
    ...(details.author ? [`author: ${formatScalar(details.author)}`] : []),
    `language: ${formatScalar(details.language)}`,
    `chapterNumbering: ${formatScalar(details.chapterNumbering)}`,
    `id: ${formatScalar(details.id)}`,
    `schemaVersion: ${details.schemaVersion}`,
  ]
  return `---\n${lines.join('\n')}\n---\n`
}

/** A new `CONTENTS.md`: the book's title, and an empty reading order. */
export function newContentsFile(title: string): string {
  return `# ${title.replace(/^#/, '\\#')}\n`
}

/**
 * A new chapter file: title and id in frontmatter (ADR 0006, ADR 0008), `form: poem` for a poem
 * (ADR 0013), then the text, if any.
 */
export function newChapterFile(title: string, id: string, body = '', form: 'prose' | 'poem' = 'prose'): string {
  const poem = form === 'poem' ? 'form: poem\n' : ''
  return `---\ntitle: ${formatScalar(title)}\nid: ${formatScalar(id)}\n${poem}---\n${body}`
}

/**
 * A new outline: just its title (Milestone 4, decision 4). An outline started from a page, such as a
 * character's arc, begins with a link to that page (Milestone 11): `path` is relative to the outline.
 * An outline from a starter (Milestone 19) continues with the starter's text under its title.
 */
export function newOutlineFile(title: string, about?: { path: string; title: string }, starter = ''): string {
  const heading = `# ${title.replace(/^#/, '\\#')}\n`
  const destination = about && (/[\s()<>]/.test(about.path) ? `<${about.path}>` : about.path)
  const link = about ? `\n[${about.title.replace(/([[\]\\])/g, '\\$1')}](${destination})\n` : ''
  const body = starter.replace(/\r\n/g, '\n').trim()
  return `${heading}${link}${body === '' ? '' : `\n${body}\n`}`
}

/**
 * The first line of a chapter's text as words, without Markdown: what an untitled poem is known by
 * (ADR 0013). Blank lines and direction fences are skipped; `null` when there is no text yet.
 */
export function firstLineOf(body: string): string | null {
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim()
    if (line === '' || line.startsWith(':::') || /^([*\-_])(\s*\1){2,}$/.test(line)) continue
    const words = line
      .replace(/\\$/, '')
      .replace(/^(#{1,6}\s+|>\s*|[-+*]\s+|\d{1,9}[.)]\s+)/, '')
      .replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, '$2')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\[([^\]]*)\]\{[^}]*\}/g, '$1')
      .replace(/(\*\*|__|\*|_)(?=\S)([\s\S]*?\S)\1/g, '$2')
      .replace(/\\([\\`*_{}[\]()#+\-.!>|~])/g, '$1')
      .trim()
    if (words !== '') return words
  }
  return null
}
