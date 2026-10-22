import type { ProjectPath } from '../../../shared-kernel/project-path'

/** What the outline commands need to know about the open project. */
export interface OutlineSettings {
  readonly readOnly: boolean
  /** The template folder: a `type: outline` file there is a template, not one of the outlines. */
  readonly ignoredFolder: ProjectPath | undefined
  /** The book's words, read on each use so a language change applies at once (ADR 0019). */
  readonly words: () => OutlineWords
}

/** The words outlines are written and read with, in the book's language. */
export interface OutlineWords {
  /** The title a new outline gets when the writer leaves the name empty. */
  readonly untitledOutline: string
  /** The `##` heading captured beats go under: the spelling to write, and every one to accept. */
  readonly inbox: { readonly write: string; readonly recognize: readonly string[] }
}
