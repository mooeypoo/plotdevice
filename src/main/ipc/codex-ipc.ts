import { CODEX_CHANNELS } from '../../contract/channels'
import type { CodexHandlers } from './codex-handlers'
import { handleTrusted } from './handle-trusted'

/** Registers the codex handlers on their fixed channels. */
export function registerCodexIpc(handlers: CodexHandlers): void {
  handleTrusted(CODEX_CHANNELS.listCodex, () => handlers.listCodex())
  handleTrusted(CODEX_CHANNELS.openEntry, (_, args) => handlers.openEntry(args))
  handleTrusted(CODEX_CHANNELS.saveEntryText, (_, args) => handlers.saveEntryText(args))
  handleTrusted(CODEX_CHANNELS.getProperties, (_, args) => handlers.getProperties(args))
  handleTrusted(CODEX_CHANNELS.updateProperties, (_, args) => handlers.updateProperties(args))
  handleTrusted(CODEX_CHANNELS.createEntry, (_, args) => handlers.createEntry(args))
  handleTrusted(CODEX_CHANNELS.setEntryType, (_, args) => handlers.setEntryType(args))
  handleTrusted(CODEX_CHANNELS.planRename, (_, args) => handlers.planRename(args))
  handleTrusted(CODEX_CHANNELS.renameEntry, (_, args) => handlers.renameEntry(args))
  handleTrusted(CODEX_CHANNELS.getAppearsIn, (_, args) => handlers.getAppearsIn(args))
}
