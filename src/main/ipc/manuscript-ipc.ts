import { MANUSCRIPT_CHANNELS } from '../../contract/channels'
import { handleTrusted } from './handle-trusted'
import type { ManuscriptHandlers } from './manuscript-handlers'

/** Registers the manuscript handlers on their fixed channels. */
export function registerManuscriptIpc(handlers: ManuscriptHandlers): void {
  handleTrusted(MANUSCRIPT_CHANNELS.getManuscript, () => handlers.getManuscript())
  handleTrusted(MANUSCRIPT_CHANNELS.openEntry, (_, args) => handlers.openEntry(args))
  handleTrusted(MANUSCRIPT_CHANNELS.saveEntryText, (_, args) => handlers.saveEntryText(args))
  handleTrusted(MANUSCRIPT_CHANNELS.getEntryProperties, (_, args) =>
    handlers.getEntryProperties(args)
  )
  handleTrusted(MANUSCRIPT_CHANNELS.updateEntryProperties, (_, args) =>
    handlers.updateEntryProperties(args)
  )
  handleTrusted(MANUSCRIPT_CHANNELS.createChapter, (_, args) => handlers.createChapter(args))
  handleTrusted(MANUSCRIPT_CHANNELS.createPart, (_, args) => handlers.createPart(args))
  handleTrusted(MANUSCRIPT_CHANNELS.renumberPart, (_, args) => handlers.renumberPart(args))
  handleTrusted(MANUSCRIPT_CHANNELS.addStatus, (_, args) => handlers.addStatus(args))
  handleTrusted(MANUSCRIPT_CHANNELS.moveChapter, (_, args) => handlers.moveChapter(args))
  handleTrusted(MANUSCRIPT_CHANNELS.movePart, (_, args) => handlers.movePart(args))
  handleTrusted(MANUSCRIPT_CHANNELS.planRename, (_, args) => handlers.planRename(args))
  handleTrusted(MANUSCRIPT_CHANNELS.renameEntry, (_, args) => handlers.renameEntry(args))
}
