import { z } from 'zod'
import type {
  ApiResult,
  CreatedEntryDto,
  EntryTextDto,
  OutlineDto,
  PlotBoardDto,
  SavedEntryDto
} from '../../contract/dtos'
import type { CaptureBeat } from '../contexts/outline/application/commands/capture-beat'
import type { CreateOutline } from '../contexts/outline/application/commands/create-outline'
import type { AddBeat } from '../contexts/outline/application/commands/add-beat'
import type { EditNotes } from '../contexts/outline/application/commands/edit-notes'
import type { MoveBeat } from '../contexts/outline/application/commands/move-beat'
import type { RetitleBeat } from '../contexts/outline/application/commands/retitle-beat'
import type { MoveColumn } from '../contexts/outline/application/commands/move-column'
import type { SaveOutlineText } from '../contexts/outline/application/commands/save-outline-text'
import type { ListOutlines } from '../contexts/outline/application/queries/list-outlines'
import type { OpenOutline } from '../contexts/outline/application/queries/open-outline'
import type { GetPlotBoard } from '../queries/get-plot-board'
import type { DomainError } from '../shared-kernel/domain-error'
import { parseProjectPath, type ProjectPath } from '../shared-kernel/project-path'
import type { Result } from '../shared-kernel/result'
import { toApiError } from './workspace-dtos'

/** The outline use cases for the open project. */
export interface OutlineUseCases {
  readonly listOutlines: ListOutlines
  readonly createOutline: CreateOutline
  readonly openOutline: OpenOutline
  readonly saveOutlineText: SaveOutlineText
  readonly getPlotBoard: GetPlotBoard
  readonly captureBeat: CaptureBeat
  readonly moveBeat: MoveBeat
  readonly moveColumn: MoveColumn
  readonly addBeat: AddBeat
  readonly retitleBeat: RetitleBeat
  readonly editNotes: EditNotes
}

/** The outline API as plain functions of untrusted arguments. */
export interface OutlineHandlers {
  list(): Promise<ApiResult<readonly OutlineDto[]>>
  create(args: readonly unknown[]): Promise<ApiResult<CreatedEntryDto>>
  openEntry(args: readonly unknown[]): Promise<ApiResult<EntryTextDto>>
  saveEntryText(args: readonly unknown[]): Promise<ApiResult<SavedEntryDto>>
  readBoard(args: readonly unknown[]): Promise<ApiResult<PlotBoardDto>>
  capture(args: readonly unknown[]): Promise<ApiResult<{ readonly version: string }>>
  moveBeat(args: readonly unknown[]): Promise<ApiResult<PlotBoardDto>>
  moveColumn(args: readonly unknown[]): Promise<ApiResult<PlotBoardDto>>
  addBeat(args: readonly unknown[]): Promise<ApiResult<PlotBoardDto>>
  retitleBeat(args: readonly unknown[]): Promise<ApiResult<PlotBoardDto>>
  editNotes(args: readonly unknown[]): Promise<ApiResult<PlotBoardDto>>
}

const path = z.string().min(1).max(4096)
const pathArgs = z.tuple([path])
const titleArgs = z.tuple([z.string().max(500)])
const saveArgs = z.tuple([
  path,
  z.string().max(20_000_000),
  z.string().min(1).max(200),
  z.boolean()
])
const version = z.string().min(1).max(200)
const itemRef = z
  .object({ line: z.number().int().min(0).max(10_000_000), title: z.string().max(10_000) })
  .strict()
const placement = z.union([z.literal('end'), z.object({ before: itemRef }).strict()])
const moveBeatArgs = z.tuple([path, version, itemRef, itemRef, placement])
const moveColumnArgs = z.tuple([path, version, itemRef, placement])
const title = z.string().max(2000)
const addBeatArgs = z.tuple([path, version, itemRef, title, placement])
const retitleArgs = z.tuple([path, version, itemRef, title])
const notesArgs = z.tuple([path, version, itemRef, z.string().max(100_000)])
const captureArgs = z.tuple([path, z.string().max(2000), z.string().min(1).max(200).nullable()])

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
    message: 'That file is not one of this project’s outlines.',
    diagnostic: { reason: 'outline-not-allowed' }
  }
}

/** The board as the file reads now, after a move. */
async function boardOf(
  useCases: OutlineUseCases,
  outline: ProjectPath
): Promise<ApiResult<PlotBoardDto>> {
  const board = await useCases.getPlotBoard(outline)
  return board.ok ? { ok: true, value: board.value } : { ok: false, error: toApiError(board.error) }
}

/** The board after an edit, or the edit's refusal. */
function afterEdit(
  useCases: OutlineUseCases,
  outline: ProjectPath,
  edited: Result<unknown, DomainError>
): Promise<ApiResult<PlotBoardDto>> {
  return edited.ok
    ? boardOf(useCases, outline)
    : Promise.resolve({ ok: false, error: toApiError(edited.error) })
}

/**
 * Builds the handlers. Only outlines the last `list` returned (or that the app just created) are
 * accepted, so the renderer can't name an arbitrary file.
 */
export function createOutlineHandlers(current: () => OutlineUseCases | undefined): OutlineHandlers {
  let outlinePaths = new Set<string>()
  let listedFor: OutlineUseCases | undefined

  const withProject = async <Args, T>(
    schema: z.ZodType<Args>,
    args: readonly unknown[],
    run: (useCases: OutlineUseCases, parsed: Args) => Promise<ApiResult<T>>
  ): Promise<ApiResult<T>> => {
    const useCases = current()
    if (useCases === undefined) return noProject
    const parsed = schema.safeParse(args)
    if (!parsed.success) return invalidRequest
    return run(useCases, parsed.data)
  }

  /** Runs `run` on a listed outline. */
  const onOutline = <Args extends readonly [string, ...unknown[]], T>(
    schema: z.ZodType<Args>,
    args: readonly unknown[],
    run: (useCases: OutlineUseCases, outline: ProjectPath, parsed: Args) => Promise<ApiResult<T>>
  ): Promise<ApiResult<T>> =>
    withProject<Args, T>(schema, args, async (useCases, parsed) => {
      const outline = parseProjectPath(parsed[0])
      return outline.ok && listedFor === useCases && outlinePaths.has(outline.value)
        ? run(useCases, outline.value, parsed)
        : notAllowed
    })

  return {
    async list() {
      const useCases = current()
      if (useCases === undefined) return noProject
      const outlines = await useCases.listOutlines()
      listedFor = useCases
      outlinePaths = new Set(outlines.map((outline) => outline.path))
      return { ok: true, value: [...outlines] }
    },

    create: (args) =>
      withProject<z.infer<typeof titleArgs>, CreatedEntryDto>(
        titleArgs,
        args,
        async (useCases, [title]) => {
          const created = await useCases.createOutline(title)
          if (!created.ok) return { ok: false, error: toApiError(created.error) }
          if (listedFor === useCases) outlinePaths.add(created.value.path)
          return { ok: true, value: { path: created.value.path } }
        }
      ),

    openEntry: (args) =>
      onOutline<z.infer<typeof pathArgs>, EntryTextDto>(
        pathArgs,
        args,
        async (useCases, outline) => {
          const opened = await useCases.openOutline(outline)
          return opened.ok
            ? { ok: true, value: { path: outline, ...opened.value } }
            : { ok: false, error: toApiError(opened.error) }
        }
      ),

    saveEntryText: (args) =>
      onOutline<z.infer<typeof saveArgs>, SavedEntryDto>(
        saveArgs,
        args,
        async (useCases, outline, [, text, version, overwrite]) => {
          const saved = await useCases.saveOutlineText(outline, text, version, overwrite)
          return saved.ok
            ? { ok: true, value: saved.value }
            : { ok: false, error: toApiError(saved.error) }
        }
      ),

    readBoard: (args) =>
      onOutline<z.infer<typeof pathArgs>, PlotBoardDto>(
        pathArgs,
        args,
        async (useCases, outline) => {
          const board = await useCases.getPlotBoard(outline)
          return board.ok
            ? { ok: true, value: board.value }
            : { ok: false, error: toApiError(board.error) }
        }
      ),

    moveBeat: (args) =>
      onOutline<z.infer<typeof moveBeatArgs>, PlotBoardDto>(
        moveBeatArgs,
        args,
        async (useCases, outline, [, at, beat, column, where]) => {
          const moved = await useCases.moveBeat(outline, at, beat, column, where)
          return moved.ok
            ? boardOf(useCases, outline)
            : { ok: false, error: toApiError(moved.error) }
        }
      ),

    moveColumn: (args) =>
      onOutline<z.infer<typeof moveColumnArgs>, PlotBoardDto>(
        moveColumnArgs,
        args,
        async (useCases, outline, [, at, column, where]) => {
          const moved = await useCases.moveColumn(outline, at, column, where)
          return moved.ok
            ? boardOf(useCases, outline)
            : { ok: false, error: toApiError(moved.error) }
        }
      ),

    addBeat: (args) =>
      onOutline<z.infer<typeof addBeatArgs>, PlotBoardDto>(
        addBeatArgs,
        args,
        async (useCases, outline, [, at, column, text, where]) =>
          afterEdit(useCases, outline, await useCases.addBeat(outline, at, column, text, where))
      ),

    retitleBeat: (args) =>
      onOutline<z.infer<typeof retitleArgs>, PlotBoardDto>(
        retitleArgs,
        args,
        async (useCases, outline, [, at, beat, text]) =>
          afterEdit(useCases, outline, await useCases.retitleBeat(outline, at, beat, text))
      ),

    editNotes: (args) =>
      onOutline<z.infer<typeof notesArgs>, PlotBoardDto>(
        notesArgs,
        args,
        async (useCases, outline, [, at, beat, notes]) =>
          afterEdit(useCases, outline, await useCases.editNotes(outline, at, beat, notes))
      ),

    capture: (args) =>
      onOutline<z.infer<typeof captureArgs>, { readonly version: string }>(
        captureArgs,
        args,
        async (useCases, outline, [, text, version]) => {
          const captured = await useCases.captureBeat(outline, text, version ?? undefined)
          return captured.ok
            ? { ok: true, value: captured.value }
            : { ok: false, error: toApiError(captured.error) }
        }
      )
  }
}
