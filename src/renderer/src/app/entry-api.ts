import type { EntryKind } from './entry-place'
import { plotDeviceApi } from './plot-device-api'

type Api = ReturnType<typeof plotDeviceApi.current>

/** How an entry's text is read and saved; every kind's API has these two. */
export type EntryTextApi = Pick<Api['manuscript'], 'openEntry' | 'saveEntryText'>

/** The API that reads and saves entries of `kind`: manuscript, outline, or codex. */
export function entryApi(kind: EntryKind): EntryTextApi {
  const api = plotDeviceApi.current()
  if (kind === 'part' || kind === 'chapter') return api.manuscript
  return kind === 'outline' ? api.outline : api.codex
}
