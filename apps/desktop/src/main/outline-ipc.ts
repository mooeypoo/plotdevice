import type { OutlineSession, OutlineState, RecentProjectsSession, WritingSession } from '@plotdevice/application'
import {
  channels,
  createOutlineSchema,
  editOutlineSchema,
  outlineFileSchema,
  placeSchema,
  type OutlineResult,
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
}

const view = <E extends string>(result: Result<OutlineState, E>): Result<OutlineView, E> =>
  result.ok ? ok(outlineView(result.value)) : result

/** Outline calls. Files outside `outlines/` are refused by the schemas before anything is read. */
export function createOutlineHandlers({ outlines, writing, recent }: OutlineIpcContext): Record<string, PayloadHandler> {
  return {
    [channels.listOutlines]: () => outlines.list(),
    [channels.createOutline]: async (payload): Promise<OutlineResult> => {
      const { title, about } = parsePayload(createOutlineSchema, payload)
      return view(await outlines.create(title, about))
    },
    [channels.openOutline]: async (payload): Promise<OutlineResult> =>
      view(await outlines.open(parsePayload(outlineFileSchema, payload).file)),
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
