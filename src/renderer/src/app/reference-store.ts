import { acceptHMRUpdate, defineStore } from 'pinia'
import { createDocumentReader, type ReadEntry } from './document-reader'
import { registerMoveFollower } from './move-followers'
import { useWorkbenchNavigation } from './use-workbench-navigation'

/** A document being consulted independently of the writable editor. */
export type ReferenceEntry = ReadEntry

/** The Reference panel: one read-only reader whose selection brings the panel forward. */
export const useReferenceStore = defineStore('reference', () => {
  const reader = createDocumentReader()

  function open(chosen: string): void {
    useWorkbenchNavigation().revealView('reference')
    reader.open(chosen)
  }

  return { ...reader, open }
})

registerMoveFollower(() => useReferenceStore())

// Keep the store's state and pick up changed actions when Vite hot-reloads this file in development.
if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useReferenceStore, import.meta.hot))
