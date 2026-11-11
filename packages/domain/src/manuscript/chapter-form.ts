/**
 * How a chapter is written (ADR 0013). A poem keeps its lines: Enter is a new line, an empty line a new
 * stanza, and export lays it out as verse. The text is stored the same way either way (`\` line
 * breaks), so changing the form never changes the words.
 */
export type ChapterForm = 'prose' | 'poem'

/**
 * A chapter's `form` from its frontmatter, or a book's `chapterForm` from `project.md`. Absent means
 * prose. A value the app doesn't know is prose too, and is kept in the file as written.
 */
export function parseChapterForm(value: unknown): ChapterForm {
  return typeof value === 'string' && value.trim().toLowerCase() === 'poem' ? 'poem' : 'prose'
}

/** True when `form` holds a value the app doesn't know, so it can be reported as "kept as written". */
export function isUnknownChapterForm(value: unknown): boolean {
  return value !== undefined && value !== null && parseChapterForm(value) === 'prose' && value !== 'prose'
}
