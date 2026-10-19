import { readChronologySettings, type ChronologySettings } from '../../domain/chronology-settings'
import type { ChronologyRepository } from '../../domain/ports/chronology-repository'

/** The project's calendar and threads. */
export type GetChronologySettings = () => Promise<ChronologySettings>

/** Builds the `GetChronologySettings` query. */
export function createGetChronologySettings(ports: {
  readonly repository: ChronologyRepository
}): GetChronologySettings {
  return async () => readChronologySettings(await ports.repository.readNovelFrontmatter())
}
