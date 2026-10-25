import type { PlotDeviceApi } from '@plotdevice/contracts'

/** Steps that send pending work to the host before the app closes, such as text still in its autosave delay. */
export const beforeClosing = new Set<() => void>()

/**
 * Answers the host's `flush` request once every step has sent its work. Calls reach the host in order,
 * so the host receives the pending saves before the reply and waits for them before quitting.
 */
export function answerFlushRequests(api: PlotDeviceApi): void {
  api.onEvent((event) => {
    if (event.kind !== 'flush') return
    for (const step of beforeClosing) step()
    void api.flushed()
  })
}
