import { z } from 'zod'
import type {
  ApiResult,
  CreatedEntryDto,
  EntryPropertiesViewDto,
  EntryTextDto,
  ManuscriptDto,
  RenumberedDto,
  SavedEntryDto
} from '../../contract/dtos'
import type { AddStatus } from '../contexts/manuscript/application/commands/add-status'
import type {
  CreateChapter,
  CreatePart
} from '../contexts/manuscript/application/commands/create-entries'
import type { RenumberPart } from '../contexts/manuscript/application/commands/renumber-part'
import type { SaveEntryText } from '../contexts/manuscript/application/commands/save-entry-text'
import type { UpdateEntryProperties } from '../contexts/manuscript/application/commands/update-entry-properties'
import type { GetEntryProperties } from '../contexts/manuscript/application/queries/get-entry-properties'
import type { GetManuscript } from '../contexts/manuscript/application/queries/get-manuscript'
import type { OpenEntry } from '../contexts/manuscript/application/queries/open-entry'
import { parseProjectPath, type ProjectPath } from '../shared-kernel/project-path'
import { toApiError } from './workspace-dtos'
import { toManuscriptDto } from './manuscript-dtos'

/** The manuscript use cases for the open project. */
export interface ManuscriptUseCases {
  readonly getManuscript: GetManuscript
  readonly openEntry: OpenEntry
  readonly saveEntryText: SaveEntryText
  readonly getEntryProperties: GetEntryProperties
  readonly updateEntryProperties: UpdateEntryProperties
  readonly createChapter: CreateChapter
  readonly createPart: CreatePart
  readonly renumberPart: RenumberPart
  readonly addStatus: AddStatus
}

/** The manuscript API as plain functions of untrusted arguments. */
export interface ManuscriptHandlers {
  getManuscript(): Promise<ApiResult<ManuscriptDto>>
  openEntry(args: readonly unknown[]): Promise<ApiResult<EntryTextDto>>
  saveEntryText(args: readonly unknown[]): Promise<ApiResult<SavedEntryDto>>
  getEntryProperties(args: readonly unknown[]): Promise<ApiResult<EntryPropertiesViewDto>>
  updateEntryProperties(args: readonly unknown[]): Promise<ApiResult<EntryPropertiesViewDto>>
  createChapter(args: readonly unknown[]): Promise<ApiResult<CreatedEntryDto>>
  createPart(args: readonly unknown[]): Promise<ApiResult<CreatedEntryDto>>
  renumberPart(args: readonly unknown[]): Promise<ApiResult<RenumberedDto>>
  addStatus(args: readonly unknown[]): Promise<ApiResult<readonly string[]>>
}

const MAX_PATH_LENGTH = 4096
const MAX_TEXT_LENGTH = 20_000_000
const MAX_FIELD_LENGTH = 10_000
const MAX_LIST_LENGTH = 500

const path = z.string().min(1).max(MAX_PATH_LENGTH)
const title = z.string().max(500)
const field = z.string().max(MAX_FIELD_LENGTH)
const list = z.array(z.string().max(500)).max(MAX_LIST_LENGTH)

const pathArgs = z.tuple([path])
const saveArgs = z.tuple([
  path,
  z.string().max(MAX_TEXT_LENGTH),
  z.string().min(1).max(200),
  z.boolean()
])
const changes = z
  .object({
    title: field.optional(),
    status: z.string().max(200).optional(),
    pov: list.optional(),
    characters: list.optional(),
    location: list.optional(),
    threads: list.optional(),
    storyDate: z.string().max(500).optional(),
    storyTime: field.optional(),
    synopsis: field.optional()
  })
  .strict()
const updateArgs = z.tuple([path, z.string().min(1).max(200), changes])
const createChapterArgs = z.tuple([path.nullable(), title])
const titleArgs = z.tuple([title])
const optionalPathArgs = z.tuple([path.nullable()])
const statusArgs = z.tuple([z.string().min(1).max(200)])

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
 * Builds the handlers. Only paths the last manuscript listing returned (or that the app just
 * created) can be opened or written, so the renderer can't touch any other file.
 */
export function createManuscriptHandlers(
  current: () => ManuscriptUseCases | undefined
): ManuscriptHandlers {
  let allowedPaths = new Set<string>()
  let allowedFor: ManuscriptUseCases | undefined

  const allowed = (useCases: ManuscriptUseCases, raw: string): ProjectPath | undefined => {
    const parsed = parseProjectPath(raw)
    return parsed.ok && allowedFor === useCases && allowedPaths.has(parsed.value)
      ? parsed.value
      : undefined
  }

  /** Runs a request against the open project with validated arguments. */
  const withProject = async <Args, T>(
    schema: z.ZodType<Args>,
    args: readonly unknown[],
    run: (useCases: ManuscriptUseCases, parsed: Args) => Promise<ApiResult<T>>
  ): Promise<ApiResult<T>> => {
    const useCases = current()
    if (useCases === undefined) return noProject
    const parsed = schema.safeParse(args)
    if (!parsed.success) return invalidRequest
    return run(useCases, parsed.data)
  }

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

    openEntry: (args) =>
      withProject<z.infer<typeof pathArgs>, EntryTextDto>(
        pathArgs,
        args,
        async (useCases, [raw]) => {
          const entry = allowed(useCases, raw)
          if (entry === undefined) return notAllowed
          const opened = await useCases.openEntry(entry)
          if (!opened.ok) return { ok: false, error: toApiError(opened.error) }
          const { text, version, wordCount } = opened.value
          return { ok: true, value: { path: entry, text, version, wordCount } }
        }
      ),

    saveEntryText: (args) =>
      withProject<z.infer<typeof saveArgs>, SavedEntryDto>(
        saveArgs,
        args,
        async (useCases, [raw, text, version, overwrite]) => {
          const entry = allowed(useCases, raw)
          if (entry === undefined) return notAllowed
          const saved = await useCases.saveEntryText(entry, text, version, overwrite)
          return saved.ok
            ? { ok: true, value: saved.value }
            : { ok: false, error: toApiError(saved.error) }
        }
      ),

    getEntryProperties: (args) =>
      withProject<z.infer<typeof pathArgs>, EntryPropertiesViewDto>(
        pathArgs,
        args,
        async (useCases, [raw]) => {
          const entry = allowed(useCases, raw)
          if (entry === undefined) return notAllowed
          const read = await useCases.getEntryProperties(entry)
          return read.ok
            ? { ok: true, value: read.value }
            : { ok: false, error: toApiError(read.error) }
        }
      ),

    updateEntryProperties: (args) =>
      withProject<z.infer<typeof updateArgs>, EntryPropertiesViewDto>(
        updateArgs,
        args,
        async (useCases, [raw, version, edits]) => {
          const entry = allowed(useCases, raw)
          if (entry === undefined) return notAllowed
          const updated = await useCases.updateEntryProperties(entry, version, edits)
          return updated.ok
            ? { ok: true, value: updated.value }
            : { ok: false, error: toApiError(updated.error) }
        }
      ),

    createChapter: (args) =>
      withProject<z.infer<typeof createChapterArgs>, CreatedEntryDto>(
        createChapterArgs,
        args,
        async (useCases, [rawPart, chapterTitle]) => {
          const part = rawPart === null ? undefined : allowed(useCases, rawPart)
          if (rawPart !== null && part === undefined) return notAllowed
          const created = await useCases.createChapter(part, chapterTitle)
          if (!created.ok) return { ok: false, error: toApiError(created.error) }
          allowedPaths.add(created.value.path)
          return { ok: true, value: { path: created.value.path } }
        }
      ),

    createPart: (args) =>
      withProject<z.infer<typeof titleArgs>, CreatedEntryDto>(
        titleArgs,
        args,
        async (useCases, [partTitle]) => {
          const created = await useCases.createPart(partTitle)
          if (!created.ok) return { ok: false, error: toApiError(created.error) }
          allowedPaths.add(created.value.path)
          return { ok: true, value: { path: created.value.path } }
        }
      ),

    renumberPart: (args) =>
      withProject<z.infer<typeof optionalPathArgs>, RenumberedDto>(
        optionalPathArgs,
        args,
        async (useCases, [rawPart]) => {
          const part = rawPart === null ? undefined : allowed(useCases, rawPart)
          if (rawPart !== null && part === undefined) return notAllowed
          const renumbered = await useCases.renumberPart(part)
          if (!renumbered.ok) return { ok: false, error: toApiError(renumbered.error) }
          return {
            ok: true,
            value: {
              changed: Object.keys(renumbered.value.versions).length,
              failed: [...renumbered.value.failed]
            }
          }
        }
      ),

    addStatus: (args) =>
      withProject<z.infer<typeof statusArgs>, readonly string[]>(
        statusArgs,
        args,
        async (useCases, [status]) => {
          const added = await useCases.addStatus(status)
          return added.ok
            ? { ok: true, value: added.value }
            : { ok: false, error: toApiError(added.error) }
        }
      )
  }
}
