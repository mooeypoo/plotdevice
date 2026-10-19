import { MANUSCRIPT_CHANNELS } from '../../contract/channels'
import { handleTrusted } from './handle-trusted'
import type { ManuscriptHandlers } from './manuscript-handlers'

/** Registers the manuscript handlers on their fixed channels. */
export function registerManuscriptIpc(handlers: ManuscriptHandlers): void {
  handleTrusted(MANUSCRIPT_CHANNELS.getManuscript, () => handlers.getManuscript())
  handleTrusted(MANUSCRIPT_CHANNELS.openEntry, (_, args) => handlers.openEntry(args))
  handleTrusted(MANUSCRIPT_CHANNELS.saveEntryText, (_, args) => handlers.saveEntryText(args))
}
