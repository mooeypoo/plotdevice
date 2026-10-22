import { z } from 'zod'
import type {
  ApiResult,
  AppearanceDto,
  CodexListingDto,
  CodexPropertiesViewDto,
  CreatedEntryDto,
  EntryTextDto,
  RenamedDto,
  RenamePlanDto,
  SavedEntryDto
} from '../../contract/dtos'
import type { CreateCodexEntry } from '../contexts/codex/application/commands/create-codex-entry'
import type { EditTemplate } from '../contexts/codex/application/commands/edit-template'
import type {
  PlanCodexRename,
  RenameCodexEntry
} from '../contexts/codex/application/commands/rename-codex-entry'
import type { SaveCodexText } from '../contexts/codex/application/commands/save-codex-text'
import type { SetEntryType } from '../contexts/codex/application/commands/set-entry-type'
import type { UpdateRelationships } from '../contexts/codex/application/commands/update-relationships'
import type { UpdateCodexProperties } from '../contexts/codex/application/commands/update-codex-properties'
import type { GetCodexProperties } from '../contexts/codex/application/queries/get-codex-properties'
import type { ListCodex } from '../contexts/codex/application/queries/list-codex'
import type { OpenCodexEntry } from '../contexts/codex/application/queries/open-codex-entry'
import type { CreateOutline } from '../contexts/outline/application/commands/create-outline'
import type { SaveOutlineText } from '../contexts/outline/application/commands/save-outline-text'
import type { ListOutlines } from '../contexts/outline/application/queries/list-outlines'
import type { OpenOutline } from '../contexts/outline/application/queries/open-outline'
import type { GetAppearsIn } from '../queries/get-appears-in'
import { parseProjectPath, projectPathName, type ProjectPath } from '../shared-kernel/project-path'
import { toApiError } from './workspace-dtos'

/**
 * The codex use cases for the open project. Outlines belong to the outline context; the codex API
 * still lists, creates, opens and saves them until `api.outline` arrives (ADR 0020).
 */
export interface CodexUseCases {
  readonly listCodex: ListCodex
  readonly openEntry: OpenCodexEntry
  readonly saveEntryText: SaveCodexText
  readonly getProperties: GetCodexProperties
  readonly updateProperties: UpdateCodexProperties
  readonly updateRelationships: UpdateRelationships
  readonly createEntry: CreateCodexEntry
  readonly editTemplate: EditTemplate
  readonly listOutlines: ListOutlines
  readonly createOutline: CreateOutline
  readonly openOutline: OpenOutline
  readonly saveOutlineText: SaveOutlineText
  readonly setEntryType: SetEntryType
  readonly planRename: PlanCodexRename
  readonly renameEntry: RenameCodexEntry
  readonly getAppearsIn: GetAppearsIn
}

/** The codex API as plain functions of untrusted arguments. */
export interface CodexHandlers {
  listCodex(): Promise<ApiResult<CodexListingDto>>
  openEntry(args: readonly unknown[]): Promise<ApiResult<EntryTextDto>>
  saveEntryText(args: readonly unknown[]): Promise<ApiResult<SavedEntryDto>>
  getProperties(args: readonly unknown[]): Promise<ApiResult<CodexPropertiesViewDto>>
  updateProperties(args: readonly unknown[]): Promise<ApiResult<CodexPropertiesViewDto>>
  updateRelationships(args: readonly unknown[]): Promise<ApiResult<CodexPropertiesViewDto>>
  createEntry(args: readonly unknown[]): Promise<ApiResult<CreatedEntryDto>>
  editTemplate(args: readonly unknown[]): Promise<ApiResult<CreatedEntryDto>>
  createOutline(args: readonly unknown[]): Promise<ApiResult<CreatedEntryDto>>
  setEntryType(args: readonly unknown[]): Promise<ApiResult<null>>
  planRename(args: readonly unknown[]): Promise<ApiResult<RenamePlanDto | null>>
  renameEntry(args: readonly unknown[]): Promise<ApiResult<RenamedDto>>
  getAppearsIn(args: readonly unknown[]): Promise<ApiResult<readonly AppearanceDto[]>>
}

const path = z.string().min(1).max(4096)
const pathArgs = z.tuple([path])
const saveArgs = z.tuple([
  path,
  z.string().max(20_000_000),
  z.string().min(1).max(200),
  z.boolean()
])
const changes = z
  .object({
    title: z.string().max(10_000).optional(),
    aliases: z.array(z.string().max(500)).max(500).optional(),
    groups: z.array(z.string().max(500)).max(500).optional(),
    role: z.string().max(500).optional(),
    born: z.string().max(500).optional()
  })
  .strict()
const updateArgs = z.tuple([path, z.string().min(1).max(200), changes])
const relationship = z
  .object({
    with: z.string().min(1).max(500),
    kind: z.string().max(500).optional(),
    note: z.string().max(10_000).optional()
  })
  .strict()
const relationshipArgs = z.tuple([path, z.string().min(1).max(200), z.array(relationship).max(500)])
const kind = z.enum(['character', 'location', 'note'])
const createArgs = z.tuple([kind, z.string().max(500)])
const kindArgs = z.tuple([kind])
const titleArgs = z.tuple([z.string().max(500)])
const typeArgs = z.tuple([
  path,
  z.enum(['part', 'chapter', 'character', 'location', 'note', 'outline'])
])

const noProject: ApiResult<never> = {
  ok: false,
  error: {
    code: 'no-project',
    message: 'No project is open.',
    diagnostic: { reason: 'no-project' }
  }
}
const invalidRequest: ApiResult<never> = {
  ok: false,
  error: {
    code: 'invalid-request',
    message: 'The request was not understood.',
    diagnostic: { reason: 'invalid-request' }
  }
}
const notAllowed: ApiResult<never> = {
  ok: false,
  error: {
    code: 'entry-not-allowed',
    message: 'That file is not in this project’s codex.',
    diagnostic: { reason: 'codex-entry-not-allowed' }
  }
}

/**
 * Builds the handlers. Only paths the last codex listing returned (or that the app just created)
 * are accepted; untyped files are accepted only for `setEntryType`.
 */
export function createCodexHandlers(current: () => CodexUseCases | undefined): CodexHandlers {
  let entryPaths = new Set<string>()
  let outlinePaths = new Set<string>()
  let untypedPaths = new Set<string>()
  let listedFor: CodexUseCases | undefined

  const allowed = (
    useCases: CodexUseCases,
    raw: string,
    paths: ReadonlySet<string>
  ): ProjectPath | undefined => {
    const parsed = parseProjectPath(raw)
    return parsed.ok && listedFor === useCases && paths.has(parsed.value) ? parsed.value : undefined
  }

  const withProject = async <Args, T>(
    schema: z.ZodType<Args>,
    args: readonly unknown[],
    run: (useCases: CodexUseCases, parsed: Args) => Promise<ApiResult<T>>
  ): Promise<ApiResult<T>> => {
    const useCases = current()
    if (useCases === undefined) return noProject
    const parsed = schema.safeParse(args)
    if (!parsed.success) return invalidRequest
    return run(useCases, parsed.data)
  }

  /** Runs `run` on an allowed codex entry path. */
  const onEntry = <Args extends readonly [string, ...unknown[]], T>(
    schema: z.ZodType<Args>,
    args: readonly unknown[],
    run: (useCases: CodexUseCases, entry: ProjectPath, parsed: Args) => Promise<ApiResult<T>>
  ): Promise<ApiResult<T>> =>
    withProject<Args, T>(schema, args, async (useCases, parsed) => {
      const entry = allowed(useCases, parsed[0], entryPaths)
      return entry === undefined ? notAllowed : run(useCases, entry, parsed)
    })

  return {
    async listCodex() {
      const useCases = current()
      if (useCases === undefined) return noProject
      const [listing, outlines] = await Promise.all([useCases.listCodex(), useCases.listOutlines()])
      listedFor = useCases
      outlinePaths = new Set(outlines.map((outline) => outline.path))
      // Templates open and save like entries; they have no properties to read.
      entryPaths = new Set([
        ...listing.entries.map((entry) => entry.path),
        ...listing.templates.map((template) => template.path),
        ...outlinePaths
      ])
      untypedPaths = new Set(listing.untyped.map((file) => file.path))
      return {
        ok: true,
        value: {
          entries: listing.entries.map((entry) => ({ ...entry, aliases: [...entry.aliases] })),
          untyped: [...listing.untyped],
          templates: [...listing.templates],
          outlines: [...outlines]
        }
      }
    },

    openEntry: (args) =>
      onEntry<z.infer<typeof pathArgs>, EntryTextDto>(pathArgs, args, async (useCases, entry) => {
        const opened = outlinePaths.has(entry)
          ? await useCases.openOutline(entry)
          : await useCases.openEntry(entry)
        return opened.ok
          ? { ok: true, value: { path: entry, ...opened.value } }
          : { ok: false, error: toApiError(opened.error) }
      }),

    saveEntryText: (args) =>
      onEntry<z.infer<typeof saveArgs>, SavedEntryDto>(
        saveArgs,
        args,
        async (useCases, entry, [, text, version, overwrite]) => {
          const saved = outlinePaths.has(entry)
            ? await useCases.saveOutlineText(entry, text, version, overwrite)
            : await useCases.saveEntryText(entry, text, version, overwrite)
          return saved.ok
            ? { ok: true, value: saved.value }
            : { ok: false, error: toApiError(saved.error) }
        }
      ),

    getProperties: (args) =>
      onEntry<z.infer<typeof pathArgs>, CodexPropertiesViewDto>(
        pathArgs,
        args,
        async (useCases, entry) => {
          const read = await useCases.getProperties(entry)
          return read.ok
            ? { ok: true, value: read.value }
            : { ok: false, error: toApiError(read.error) }
        }
      ),

    updateProperties: (args) =>
      onEntry<z.infer<typeof updateArgs>, CodexPropertiesViewDto>(
        updateArgs,
        args,
        async (useCases, entry, [, version, edits]) => {
          const updated = await useCases.updateProperties(entry, version, edits)
          return updated.ok
            ? { ok: true, value: updated.value }
            : { ok: false, error: toApiError(updated.error) }
        }
      ),

    updateRelationships: (args) =>
      onEntry<z.infer<typeof relationshipArgs>, CodexPropertiesViewDto>(
        relationshipArgs,
        args,
        async (useCases, entry, [, version, relationships]) => {
          const updated = await useCases.updateRelationships(entry, version, relationships)
          return updated.ok
            ? { ok: true, value: updated.value }
            : { ok: false, error: toApiError(updated.error) }
        }
      ),

    createEntry: (args) =>
      withProject<z.infer<typeof createArgs>, CreatedEntryDto>(
        createArgs,
        args,
        async (useCases, [entryKind, title]) => {
          const created = await useCases.createEntry(entryKind, title)
          if (!created.ok) return { ok: false, error: toApiError(created.error) }
          if (listedFor === useCases) entryPaths.add(created.value.path)
          return { ok: true, value: { path: created.value.path } }
        }
      ),

    editTemplate: (args) =>
      withProject<z.infer<typeof kindArgs>, CreatedEntryDto>(
        kindArgs,
        args,
        async (useCases, [entryKind]) => {
          const template = await useCases.editTemplate(entryKind)
          if (!template.ok) return { ok: false, error: toApiError(template.error) }
          if (listedFor === useCases) entryPaths.add(template.value.path)
          return { ok: true, value: { path: template.value.path } }
        }
      ),

    createOutline: (args) =>
      withProject<z.infer<typeof titleArgs>, CreatedEntryDto>(
        titleArgs,
        args,
        async (useCases, [title]) => {
          const created = await useCases.createOutline(title)
          if (!created.ok) return { ok: false, error: toApiError(created.error) }
          if (listedFor === useCases) {
            entryPaths.add(created.value.path)
            outlinePaths.add(created.value.path)
          }
          return { ok: true, value: { path: created.value.path } }
        }
      ),

    setEntryType: (args) =>
      withProject<z.infer<typeof typeArgs>, null>(typeArgs, args, async (useCases, [raw, type]) => {
        const file = allowed(useCases, raw, untypedPaths)
        if (file === undefined) return notAllowed
        const set = await useCases.setEntryType(file, type)
        return set.ok ? { ok: true, value: null } : { ok: false, error: toApiError(set.error) }
      }),

    planRename: (args) =>
      onEntry<z.infer<typeof pathArgs>, RenamePlanDto | null>(
        pathArgs,
        args,
        async (useCases, entry) => {
          const plan = await useCases.planRename(entry)
          if (!plan.ok) return { ok: false, error: toApiError(plan.error) }
          return {
            ok: true,
            value:
              plan.value === null
                ? null
                : { ...plan.value, newName: projectPathName(plan.value.newPath) }
          }
        }
      ),

    renameEntry: (args) =>
      onEntry<z.infer<typeof pathArgs>, RenamedDto>(pathArgs, args, async (useCases, entry) => {
        const renamed = await useCases.renameEntry(entry)
        if (!renamed.ok) return { ok: false, error: toApiError(renamed.error) }
        const { path: newPath, links } = renamed.value
        entryPaths.add(newPath)
        return {
          ok: true,
          value: {
            path: newPath,
            linkCount: links.linkCount,
            fileCount: links.changedFiles.length,
            skipped: [...links.skipped]
          }
        }
      }),

    getAppearsIn: (args) =>
      onEntry<z.infer<typeof pathArgs>, readonly AppearanceDto[]>(
        pathArgs,
        args,
        async (useCases, entry) => ({ ok: true, value: await useCases.getAppearsIn(entry) })
      )
  }
}
