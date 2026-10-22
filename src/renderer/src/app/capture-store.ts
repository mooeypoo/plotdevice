import { acceptHMRUpdate, defineStore } from 'pinia'
import { nextTick, ref } from 'vue'
import { useEditorStore } from './editor-store'
import { useOutlineStore } from './outline-store'
import { plotDeviceApi } from './plot-device-api'
import { useDocumentTabsStore } from './document-tabs-store'
import { useWritingPreferencesStore } from './writing-preferences-store'
import { useErrorNotice } from '../shared/use-error-notice'

/** The link a captured beat ends with: the chapter's file name, as links are written. */
function linkTo(path: string): string {
  const name = path.slice(path.lastIndexOf('/') + 1).replace(/\.md$/iu, '')
  return `[[${name}]]`
}

/**
 * Capture a beat (experimental, off by default): a one-line box that appends a bullet to the
 * current outline's Inbox, the only outline write allowed while writing (brief §4.4, ADR 0020).
 */
export const useCaptureStore = defineStore('capture', () => {
  const open = ref(false)
  const busy = ref(false)
  const { message: error, source: errorSource } = useErrorNotice()
  let returnTo: HTMLElement | null = null

  /** Opens the box; focus goes back to `from` (where the writer was) when it closes. */
  function show(from: HTMLElement | null = null): void {
    const outlines = useOutlineStore()
    if (!useWritingPreferencesStore().captureBeats || outlines.currentPath === null) return
    returnTo =
      from ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)
    errorSource.value = null
    open.value = true
  }

  function close(): void {
    open.value = false
    const target = returnTo
    returnTo = null
    void nextTick(() => target?.focus())
  }

  /**
   * Appends `text` to the Inbox. When the outline is open in the editor, its draft is saved first
   * and the editor then loads the new text, so there is only ever one writer (ADR 0018).
   */
  async function capture(text: string): Promise<boolean> {
    const outline = useOutlineStore().currentPath
    const editor = useEditorStore()
    if (outline === null || text.trim() === '' || busy.value) return false
    busy.value = true
    try {
      let version: string | null = null
      if (editor.entry?.path === outline) {
        const held = await editor.versionForPropertyChange()
        if (held === undefined) {
          errorSource.value = { notice: 'capture-outline-unsaved' }
          return false
        }
        version = held
      }
      // The Writing target, or else the open part or chapter, as the cast strip uses it.
      const entry = editor.entry
      const chapter =
        useDocumentTabsStore().writingPath ??
        (entry !== null && (entry.kind === 'chapter' || entry.kind === 'part') ? entry.path : null)
      const withLink =
        useWritingPreferencesStore().captureLinksChapter && chapter !== null
          ? `${text.trim()} ${linkTo(chapter)}`
          : text.trim()
      const result = await plotDeviceApi.current().outline.capture(outline, withLink, version)
      if (!result.ok) {
        errorSource.value = result.error
        return false
      }
      if (editor.entry?.path === outline) await editor.reloadAfterWrite(outline)
      useOutlineStore().touched()
      close()
      return true
    } finally {
      busy.value = false
    }
  }

  return { open, busy, error, show, close, capture }
})

// Keep the store's state and pick up changed actions when Vite hot-reloads this file in development.
if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useCaptureStore, import.meta.hot))
