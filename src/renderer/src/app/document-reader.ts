import { ref, shallowRef, watch } from 'vue'
import { useErrorNotice } from '../shared/use-error-notice'
import { placeOf } from './entry-owners'
import type { EntryPlace } from './entry-place'
import { plotDeviceApi } from './plot-device-api'

/** A document being read independently of the writable editor. */
export interface ReadEntry extends EntryPlace {
  readonly path: string
}

/**
 * One read-only view of a document: which one, its text as last read, and reading positions for
 * the session. Any number can exist beside the one writable editor (ADR 0018). A reader never
 * saves, never flushes the editor, and drops replies to reads it no longer wants.
 */
export function createDocumentReader() {
  const path = ref<string | null>(null)
  const entry = shallowRef<ReadEntry | null>(null)
  const text = ref<string | null>(null)
  const { message: error, source: errorSource } = useErrorNotice()
  const loading = ref(false)
  const positions = new Map<string, number>()
  let request = 0

  async function reload(): Promise<void> {
    const identity = ++request
    const current = path.value
    const place = current === null ? undefined : placeOf(current)
    text.value = null
    error.value = null
    loading.value = false
    if (current === null) return
    if (place === undefined) {
      errorSource.value = { notice: 'reference-not-listed', path: current }
      return
    }
    entry.value = { ...place, path: current }
    loading.value = true
    const api = plotDeviceApi.current()
    const result = await (
      place.kind === 'chapter' || place.kind === 'part' ? api.manuscript : api.codex
    ).openEntry(current)
    if (identity !== request) return
    loading.value = false
    if (result.ok) text.value = result.value.text
    else errorSource.value = result.error
  }

  watch(path, () => void reload(), { flush: 'sync' })

  /** Reads `chosen`, or reads the current document again. */
  function open(chosen: string): void {
    if (chosen === path.value) void reload()
    else {
      entry.value = null
      path.value = chosen
    }
  }

  function rememberScroll(top: number, forPath = path.value): void {
    if (forPath !== null) positions.set(forPath, top)
  }

  function scrollTop(forPath = path.value): number {
    return forPath === null ? 0 : (positions.get(forPath) ?? 0)
  }

  function followMove(from: string, to: string): void {
    if (from === to) return
    const top = positions.get(from)
    if (top !== undefined) positions.set(to, top)
    positions.delete(from)
    if (path.value === from) path.value = to
  }

  function clear(): void {
    request += 1
    path.value = null
    entry.value = null
    text.value = null
    error.value = null
    loading.value = false
    positions.clear()
  }

  return {
    path,
    entry,
    text,
    error,
    loading,
    open,
    reload,
    rememberScroll,
    scrollTop,
    followMove,
    clear
  }
}
