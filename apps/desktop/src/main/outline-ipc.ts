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
} from '@plotdevice/contracts'
import { ok, type Result } from '@plotdevice/shared'
import { parsePayload } from './payload'
import type { PayloadHandler } from './project-ipc'
import { outlineView } from './views'

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
    [channels.undoOutline]: async (payload): Promise<OutlineResult> =>
      view(await outlines.undo(parsePayload(outlineFileSchema, payload).file)),
    [channels.rememberPlace]: async (payload) => {
      const { workspace, outline, view: kind } = parsePayload(placeSchema, payload)
      const project = writing.project()
      if (project) await recent.place(project.root, { workspace, ...(outline ? { outline } : {}), ...(kind ? { view: kind } : {}) })
    },
  }
}
