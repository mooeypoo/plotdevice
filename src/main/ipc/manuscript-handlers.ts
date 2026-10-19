import { z } from 'zod'
import type { ApiResult, EntryTextDto, ManuscriptDto, SavedEntryDto } from '../../contract/dtos'
import type { SaveEntryText } from '../contexts/manuscript/application/commands/save-entry-text'
import type { GetManuscript } from '../contexts/manuscript/application/queries/get-manuscript'
import type { OpenEntry } from '../contexts/manuscript/application/queries/open-entry'
import { parseProjectPath } from '../shared-kernel/project-path'
import { toApiError } from './workspace-dtos'
import { toManuscriptDto } from './manuscript-dtos'

/** The manuscript use cases for the open project. */
export interface ManuscriptUseCases {
  readonly getManuscript: GetManuscript
  readonly openEntry: OpenEntry
  readonly saveEntryText: SaveEntryText
}

/** The manuscript API as plain functions of untrusted arguments. */
export interface ManuscriptHandlers {
  getManuscript(): Promise<ApiResult<ManuscriptDto>>
  openEntry(args: readonly unknown[]): Promise<ApiResult<EntryTextDto>>
  saveEntryText(args: readonly unknown[]): Promise<ApiResult<SavedEntryDto>>
}

const MAX_PATH_LENGTH = 4096
const MAX_TEXT_LENGTH = 20_000_000

const pathArgs = z.tuple([z.string().min(1).max(MAX_PATH_LENGTH)])
const saveArgs = z.tuple([
  z.string().min(1).max(MAX_PATH_LENGTH),
  z.string().max(MAX_TEXT_LENGTH),
  z.string().min(1).max(200),
  z.boolean()
])

const noProject: ApiResult<never> = {
  ok: false,
  error: { code: 'no-project', message: 'No project is open.' }
}
const invalidRequest: ApiResult<never> = {
  ok: false,
  error: { code: 'invalid-request', message: 'The request was not understood.' }
}
const notAllowed: ApiResult<never> = {
  ok: false,
  error: {
    code: 'entry-not-allowed',
    message: 'That file is not a part or chapter of this project.'
  }
}

/**
 * Builds the handlers. Only paths the last manuscript listing returned can be opened or saved, so
 * the renderer can't write to any other file.
 */
export function createManuscriptHandlers(
  current: () => ManuscriptUseCases | undefined
): ManuscriptHandlers {
  let allowedPaths = new Set<string>()
  let allowedFor: ManuscriptUseCases | undefined

  const allowed = (useCases: ManuscriptUseCases, path: string): boolean =>
    allowedFor === useCases && allowedPaths.has(path)

  return {
    async getManuscript() {
      const useCases = current()
      if (useCases === undefined) return noProject
      const view = await useCases.getManuscript()
      const { manuscript } = view
      allowedFor = useCases
      allowedPaths = new Set([
        ...[...manuscript.parts, ...manuscript.unnumberedParts].flatMap((section) => [
          section.part.path,
          ...section.chapters.map((entry) => entry.chapter.path)
        ]),
        ...manuscript.chapters.map((entry) => entry.chapter.path),
        ...manuscript.unordered.map((entry) => entry.chapter.path)
      ])
      return { ok: true, value: toManuscriptDto(view) }
    },

    async openEntry(args) {
      const useCases = current()
      if (useCases === undefined) return noProject
      const parsed = pathArgs.safeParse(args)
      if (!parsed.success) return invalidRequest
      const path = parseProjectPath(parsed.data[0])
      if (!path.ok || !allowed(useCases, path.value)) return notAllowed

      const opened = await useCases.openEntry(path.value)
      if (!opened.ok) return { ok: false, error: toApiError(opened.error) }
      const { text, version, wordCount } = opened.value
      return { ok: true, value: { path: path.value, text, version, wordCount } }
    },

    async saveEntryText(args) {
      const useCases = current()
      if (useCases === undefined) return noProject
      const parsed = saveArgs.safeParse(args)
      if (!parsed.success) return invalidRequest
      const [rawPath, text, version, overwrite] = parsed.data
      const path = parseProjectPath(rawPath)
      if (!path.ok || !allowed(useCases, path.value)) return notAllowed

      const saved = await useCases.saveEntryText(path.value, text, version, overwrite)
      if (!saved.ok) return { ok: false, error: toApiError(saved.error) }
      return { ok: true, value: saved.value }
    }
  }
}
