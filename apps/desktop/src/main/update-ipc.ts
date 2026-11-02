import type { UpdateSession } from '@plotdevice/application'
import { channels, dismissUpdateSchema, type LatestRelease, type UpdateCheckView, type UpdateView } from '@plotdevice/contracts'
import { parsePayload } from './payload'
import type { PayloadHandler } from './project-ipc'

export interface UpdateIpcContext {
  updates: UpdateSession
}

/** What the page needs of a release: no format or date. */
export const updateView = (release: LatestRelease): UpdateView => ({
  version: release.version,
  notes: release.notes,
  download: release.download,
})

/** Update notices (Milestone 15). */
export function createUpdateHandlers({ updates }: UpdateIpcContext): Record<string, PayloadHandler> {
  return {
    [channels.getUpdate]: async (): Promise<UpdateView | null> => {
      const release = updates.notice()
      return release && updateView(release)
    },
    [channels.checkForUpdates]: async (): Promise<UpdateCheckView> => {
      const check = await updates.checkNow()
      return check.kind === 'newer' ? { kind: 'newer', update: updateView(check.release) } : check
    },
    [channels.dismissUpdate]: async (payload) => {
      await updates.dismiss(parsePayload(dismissUpdateSchema, payload).version)
    },
  }
}
