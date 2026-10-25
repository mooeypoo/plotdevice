import type { ProjectFolders, ProjectSnapshot } from '@plotdevice/application'
import { compiledBook, directionOfLanguage } from '@plotdevice/domain'
import { formatScalar, splitFrontmatter } from '@plotdevice/markdown'
import type { ProjectPath } from '@plotdevice/shared'

export interface CompiledText {
  /** One Markdown file: Pandoc metadata, then parts and chapters in reading order. */
  text: string
  /** Chapters in the contents that couldn't be read; reported, never silently left out. */
  missing: ProjectPath[]
}

/**
 * The whole book as one Markdown file (Milestone 6, decision 4). Chapter text is kept as written,
 * direction markers included, which Pandoc understands; chapter frontmatter is left out. The result
 * is a new file, so it uses `\n` line endings throughout. Nothing in the project is changed.
 */
export async function compileManuscript(folders: ProjectFolders, snapshot: ProjectSnapshot): Promise<CompiledText> {
  const store = folders.open(snapshot.root)
  const { details } = snapshot
  const titles = new Map(snapshot.chapters.flatMap((chapter) => (chapter.title ? [[chapter.file, chapter.title] as const] : [])))
  const metadata = [
    `title: ${formatScalar(details.title)}`,
    ...(details.author ? [`author: ${formatScalar(details.author)}`] : []),
    `lang: ${formatScalar(details.language)}`,
    ...(directionOfLanguage(details.language) === 'rtl' ? ['dir: rtl'] : []),
  ]
  const blocks: string[] = [`---\n${metadata.join('\n')}\n---`]
  const missing: ProjectPath[] = []
  for (const entry of compiledBook(snapshot.contents, details.chapterNumbering, titles)) {
    if (entry.kind === 'part') {
      blocks.push(entry.heading)
      continue
    }
    const read = await store.read(entry.file)
    if (!read.ok) {
      missing.push(entry.file)
      continue
    }
    const body = splitFrontmatter(read.value.text).body.replace(/\r\n?/g, '\n').trim()
    blocks.push(body === '' ? entry.heading : `${entry.heading}\n\n${body}`)
  }
  return { text: `${blocks.join('\n\n')}\n`, missing }
}
