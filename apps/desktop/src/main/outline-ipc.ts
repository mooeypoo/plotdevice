import type { OutlineSession, OutlineState, RecentProjectsSession, WritingSession } from '@plotdevice/application'
import {
  channels,
  createOutlineSchema,
  editOutlineSchema,
  outlineFileSchema,
  placeSchema,
  type OutlineResult,
  type StarterId,
  type OutlineView,
  type ProjectChangeResult,
} from '@plotdevice/contracts'
import { mainOutlineToKeep } from '@plotdevice/domain'
import { err, ok, type Result } from '@plotdevice/shared'
import { parsePayload } from './payload'
import type { PayloadHandler } from './project-ipc'
import { outlineView, projectView } from './views'

export interface OutlineIpcContext {
  outlines: OutlineSession
  writing: WritingSession
  recent: RecentProjectsSession
  /** A starter outline's text under its title, in the story's language (Milestone 19). */
  starter(id: StarterId, language: string): string
}

const view = <E extends string>(result: Result<OutlineState, E>): Result<OutlineView, E> =>
  result.ok ? ok(outlineView(result.value)) : result

/** Outline calls. Files outside `outlines/` are refused by the schemas before anything is read. */
export function createOutlineHandlers({ outlines, writing, recent, starter }: OutlineIpcContext): Record<string, PayloadHandler> {
  return {
    [channels.listOutlines]: () => outlines.list(),
    [channels.createOutline]: async (payload): Promise<OutlineResult> => {
      const request = parsePayload(createOutlineSchema, payload)
      const language = writing.project()?.details.language ?? 'en'
      // Outlines are listed by file name, so a new one could come first and become main: write down the
      // current main before adding it (ADR 0012).
      const named = writing.project()?.details.mainOutline ?? null
      const keep = mainOutlineToKeep(
        named,
        (await outlines.list()).map((outline) => outline.file),
      )
      if (keep) await writing.setMainOutline(keep)
      return view(await outlines.create(request.title, request.about, request.starter && starter(request.starter, language)))
    },
    [channels.openOutline]: async (payload): Promise<OutlineResult> => {
      const { file } = parsePayload(outlineFileSchema, payload)
      // Text typed in the outline's Text view is saved like a chapter's: it lands before the outline is read.
      await writing.idle()
      return view(await outlines.open(file))
    },
    [channels.editOutline]: async (payload): Promise<OutlineResult> => {
      const { file, edit } = parsePayload(editOutlineSchema, payload)
      return view(await outlines.edit(file, edit))
    },
    [channels.setMainOutline]: async (payload): Promise<ProjectChangeResult> => {
      const { file } = parsePayload(outlineFileSchema, payload)
      if (!(await outlines.list()).some((outline) => outline.file === file)) return err('not-found')
      const written = await writing.setMainOutline(file)
      return written.ok ? ok(projectView(written.value)) : written
    },
    [channels.undoOutline]: async (payload): Promise<OutlineResult> =>
      view(await outlines.undo(parsePayload(outlineFileSchema, payload).file)),
    [channels.rememberPlace]: async (payload) => {
      const { workspace, outline, view: kind } = parsePayload(placeSchema, payload)
      const project = writing.project()
      if (project) await recent.place(project.root, { workspace, ...(outline ? { outline } : {}), ...(kind ? { view: kind } : {}) })
    },
  }
}
