import { err, ok, type Brand, type Result } from '@plotdevice/shared'
import type { ChapterNumbering } from '../manuscript/index'

export type ProjectId = Brand<string, 'ProjectId'>
export type ChapterId = Brand<string, 'ChapterId'>

/** The project's details from `project.md` frontmatter (ADR 0006). */
export interface ProjectDetails {
  title: string
  author?: string
  language: string
  chapterNumbering: ChapterNumbering
  id?: ProjectId
  schemaVersion: number
}

export const CURRENT_SCHEMA_VERSION = 1

export interface NewProject {
  title: string
  language: string
  author?: string
}

export type ProjectProblem = 'empty-title' | 'multiline-title' | 'invalid-language'

const LANGUAGE_TAG = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/

/** What a new project needs: a one-line title and a language tag such as `he` or `en-GB`. */
export function validateNewProject(input: NewProject): Result<NewProject, ProjectProblem[]> {
  const title = input.title.trim()
  const problems: ProjectProblem[] = []
  if (title === '') problems.push('empty-title')
  if (/[\r\n]/.test(title)) problems.push('multiline-title')
  if (!LANGUAGE_TAG.test(input.language)) problems.push('invalid-language')
  if (problems.length > 0) return err(problems)
  const author = input.author?.trim()
  return ok({ title, language: input.language, ...(author ? { author } : {}) })
}
