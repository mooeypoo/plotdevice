import { INTERACTIONS_CHANNELS } from '../../contract/channels'
import { handleTrusted } from './handle-trusted'
import type { InteractionsHandlers } from './interactions-handlers'

/** Registers the interactions handlers on their fixed channels. */
export function registerInteractionsIpc(handlers: InteractionsHandlers): void {
  handleTrusted(INTERACTIONS_CHANNELS.getInteractions, () => handlers.getInteractions())
}
