import type { GetChronologySettings } from '../contexts/chronology/application/queries/get-chronology-settings'
import type { ListStatuses } from '../contexts/manuscript/application/queries/list-statuses'

/** The choices the inspector offers, gathered from the manuscript and chronology contexts. */
export interface InspectorVocabulary {
  readonly statuses: readonly string[]
  readonly threads: readonly {
    readonly key: string
    readonly name: string
    readonly color?: string
  }[]
  readonly calendar: 'gregorian' | 'day-count'
}

/** Reads the inspector's choices. A cross-context read model: it changes nothing. */
export type GetInspectorVocabulary = () => Promise<InspectorVocabulary>

/** Builds the `GetInspectorVocabulary` query. */
export function createGetInspectorVocabulary(ports: {
  readonly listStatuses: ListStatuses
  readonly getChronologySettings: GetChronologySettings
}): GetInspectorVocabulary {
  return async () => {
    const [statuses, chronology] = await Promise.all([
      ports.listStatuses(),
      ports.getChronologySettings()
    ])
    return { statuses, threads: chronology.threads, calendar: chronology.calendar }
  }
}
