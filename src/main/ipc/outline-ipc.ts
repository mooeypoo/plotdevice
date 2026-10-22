import { OUTLINE_CHANNELS } from '../../contract/channels'
import { handleTrusted } from './handle-trusted'
import type { OutlineHandlers } from './outline-handlers'

/** Registers the outline handlers on their fixed channels. */
export function registerOutlineIpc(handlers: OutlineHandlers): void {
  handleTrusted(OUTLINE_CHANNELS.list, () => handlers.list())
  handleTrusted(OUTLINE_CHANNELS.create, (_, args) => handlers.create(args))
  handleTrusted(OUTLINE_CHANNELS.openEntry, (_, args) => handlers.openEntry(args))
  handleTrusted(OUTLINE_CHANNELS.saveEntryText, (_, args) => handlers.saveEntryText(args))
  handleTrusted(OUTLINE_CHANNELS.readBoard, (_, args) => handlers.readBoard(args))
  handleTrusted(OUTLINE_CHANNELS.capture, (_, args) => handlers.capture(args))
}
