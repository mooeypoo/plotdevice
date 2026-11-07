import type { ProjectPath } from '@plotdevice/shared'
import type { ChapterNumbering, Contents } from '../manuscript/index'
import { bookOutline } from './book-outline'

export type CompiledEntry = { kind: 'part'; heading: string } | { kind: 'chapter'; file: ProjectPath; heading: string }

/**
 * The compiled book's structure (PRD §6, scenario E): parts as `#` headings and chapters as `##`
 * headings, numbered as the project's setting says, in reading order. A chapter is named by its title,
 * or its contents link text when it has none. The chapter text is filled in by whoever reads the files.
 */
export function compiledBook(contents: Contents, numbering: ChapterNumbering, titles: ReadonlyMap<ProjectPath, string>): CompiledEntry[] {
  return bookOutline(contents, numbering, titles).map((entry) =>
    entry.kind === 'part'
      ? { kind: 'part', heading: `# ${escapeHeading(entry.name)}` }
      : {
          kind: 'chapter',
          file: entry.file,
          heading: `## ${entry.number === null ? '' : `${entry.number}. `}${escapeHeading(entry.name)}`,
        },
  )
}

const escapeHeading = (text: string): string => text.replace(/^#/, '\\#')
