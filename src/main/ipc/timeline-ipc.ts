import { TIMELINE_CHANNELS } from '../../contract/channels'
import { handleTrusted } from './handle-trusted'
import type { TimelineHandlers } from './timeline-handlers'

/** Registers the timeline handlers on their fixed channels. */
export function registerTimelineIpc(handlers: TimelineHandlers): void {
  handleTrusted(TIMELINE_CHANNELS.getTimeline, () => handlers.getTimeline())
}
