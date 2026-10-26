import type { ProjectPath } from '@plotdevice/shared'
import { chapterNumbers, type ChapterNumbering, type Contents } from '../manuscript/index'

export type CompiledEntry = { kind: 'part'; heading: string } | { kind: 'chapter'; file: ProjectPath; heading: string }

/**
 * The compiled book's structure (PRD §6, scenario E): parts as `#` headings and chapters as `##`
 * headings, numbered as the project's setting says, in reading order. A chapter is named by its title,
 * or its contents link text when it has none. The chapter text is filled in by whoever reads the files.
 */
export function compiledBook(contents: Contents, numbering: ChapterNumbering, titles: ReadonlyMap<ProjectPath, string>): CompiledEntry[] {
  const numbers = chapterNumbers(contents, numbering)
  const chapter = (file: ProjectPath, linkText: string): CompiledEntry => {
    const number = numbers.get(file) ?? null
    const name = escapeHeading(titles.get(file) ?? linkText)
    return { kind: 'chapter', file, heading: `## ${number === null ? '' : `${number}. `}${name}` }
  }
  return contents.entries.flatMap((entry): CompiledEntry[] =>
    entry.kind === 'chapter'
      ? [chapter(entry.file, entry.linkText)]
      : [{ kind: 'part', heading: `# ${escapeHeading(entry.name)}` }, ...entry.chapters.map((c) => chapter(c.file, c.linkText))],
  )
}

const escapeHeading = (text: string): string => text.trim().replace(/^#/, '\\#')
