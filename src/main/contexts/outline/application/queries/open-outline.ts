import type { ProjectPath } from '../../../../shared-kernel/project-path'
import { ok, type Result } from '../../../../shared-kernel/result'
import { countWords } from '../../../../shared-kernel/word-count'
import type { OutlineRepository, ReadOutlineError } from '../../domain/ports/outline-repository'

/** An outline's body for the editor. */
export interface OpenedOutline {
  readonly text: string
  readonly version: string
  readonly wordCount: number
}

/** Reads an outline's body. */
export type OpenOutline = (path: ProjectPath) => Promise<Result<OpenedOutline, ReadOutlineError>>

/** Builds the `OpenOutline` query. */
export function createOpenOutline(ports: { readonly repository: OutlineRepository }): OpenOutline {
  return async (path) => {
    const read = await ports.repository.readText(path)
    return read.ok ? ok({ ...read.value, wordCount: countWords(read.value.text) }) : read
  }
}
