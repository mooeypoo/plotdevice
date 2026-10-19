import type { Clock } from '../domain/ports/clock'

/** The real clock. */
export const systemClock: Clock = {
  now: () => new Date()
}
