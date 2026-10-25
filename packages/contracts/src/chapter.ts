import type { ProjectPath, Result } from '@plotdevice/shared'
import { z } from 'zod'
import { projectPathSchema, type ProjectView } from './project'

/** Chapters well beyond any novel's: a guard against runaway payloads, not a writing limit. */
const MAX_CHAPTER_CHARACTERS = 20_000_000

export const openChapterSchema = z.strictObject({ file: projectPathSchema })
export const saveChapterSchema = z.strictObject({ file: projectPathSchema, text: z.string().max(MAX_CHAPTER_CHARACTERS), generation: z.number().int().positive() })
export const resolveConflictSchema = z.strictObject({ file: projectPathSchema, choice: z.enum(['keep-both', 'use-mine']) })
export const leftOffSchema = z.strictObject({ file: projectPathSchema, cursor: z.number().int().nonnegative() })

export type SaveChapterRequest = z.infer<typeof saveChapterSchema>
export type ResolveConflictRequest = z.infer<typeof resolveConflictSchema>
export type LeftOffRequest = z.infer<typeof leftOffSchema>

/** What the status line says. "saved" only after the text is confirmed on disk. */
export type SaveStatusView = 'saved' | 'unsaved' | 'saving' | 'conflict' | 'failed'

export interface ChapterView {
  file: ProjectPath
  text: string
  /** Sent back with every save, so a save typed into an outdated text is never written (see `chapter-reloaded`). */
  generation: number
  status: SaveStatusView
}

export type OpenChapterResult = Result<ChapterView, 'no-project' | 'missing' | 'unreadable'>
export type ResolveConflictResult = Result<{ copy: ProjectPath | null; text: string | null; generation: number; project: ProjectView }, 'no-conflict' | 'missing' | 'changed-again' | 'write-failed'>

/** Sent from the host as things happen. */
export type HostEvent =
  | { kind: 'save-status'; file: ProjectPath; status: SaveStatusView }
  | { kind: 'chapter-reloaded'; file: ProjectPath; text: string; generation: number }
  | { kind: 'project-changed'; project: ProjectView }
  /** The app is closing: send any text still waiting to be saved. */
  | { kind: 'flush' }
