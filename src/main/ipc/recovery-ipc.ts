import { RECOVERY_CHANNELS } from '../../contract/channels'
import { handleTrusted } from './handle-trusted'
import type { createRecoveryHandlers } from './recovery-handlers'

/** Registers recovery on fixed channels with the same trusted-window checks as other APIs. */
export function registerRecoveryIpc(handlers: ReturnType<typeof createRecoveryHandlers>): void {
  handleTrusted(RECOVERY_CHANNELS.capture, (_, args) => handlers.capture(args))
  handleTrusted(RECOVERY_CHANNELS.saveCopy, (_, args) => handlers.saveCopy(args))
}
