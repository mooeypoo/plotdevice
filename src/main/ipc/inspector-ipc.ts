import { INSPECTOR_CHANNELS } from '../../contract/channels'
import { handleTrusted } from './handle-trusted'
import type { InspectorHandlers } from './inspector-handlers'

/** Registers the inspector handlers on their fixed channels. */
export function registerInspectorIpc(handlers: InspectorHandlers): void {
  handleTrusted(INSPECTOR_CHANNELS.getVocabulary, () => handlers.getVocabulary())
  handleTrusted(INSPECTOR_CHANNELS.checkStoryDate, (_, args) => handlers.checkStoryDate(args))
}
