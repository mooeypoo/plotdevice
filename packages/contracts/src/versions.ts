import type { ProjectPath, Result } from '@plotdevice/shared'
import { z } from 'zod'
import { projectPathSchema } from './project'

const markdownFile = projectPathSchema.refine((file) => file.endsWith('.md'))
const at = z.number().int().nonnegative()

export const versionsSchema = z.strictObject({ file: markdownFile })
export const versionSchema = z.strictObject({ file: markdownFile, at })
export const restoreVersionSchema = z.strictObject({ file: markdownFile, at, revision: z.string().min(1).max(200) })

export interface VersionsView {
  /** The file as it is now: restoring is refused if it changes before the author chooses. */
  revision: string
  /** When each earlier version was kept, newest first (milliseconds since 1970, UTC). */
  versions: number[]
}

export type VersionProblem = 'no-project' | 'missing' | 'unreadable' | 'stale' | 'write-failed'
export type VersionResult<T> = Result<T, VersionProblem>
export type CopyVersionResult = Result<{ copy: ProjectPath }, VersionProblem>
