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

/** A new chapter file: title and id in frontmatter (ADR 0006, ADR 0008), then the text, if any. */
export function newChapterFile(title: string, id: string, body = ''): string {
  return `---\ntitle: ${formatScalar(title)}\nid: ${formatScalar(id)}\n---\n${body}`
}

/** A new outline: just its title (Milestone 4, decision 4). */
export function newOutlineFile(title: string): string {
  return `# ${title.replace(/^#/, '\\#')}\n`
}
