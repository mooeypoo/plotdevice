import { acceptHMRUpdate, defineStore } from 'pinia'
import { shallowRef } from 'vue'
import type { InspectorVocabularyDto } from '../../../contract/dtos'
import { plotDeviceApi } from './plot-device-api'
import { useErrorNotice } from '../shared/use-error-notice'

/** The inspector's choices (statuses, threads, calendar) for the open project. */
export const useInspectorStore = defineStore('inspector', () => {
  const vocabulary = shallowRef<InspectorVocabularyDto | null>(null)
  const { message: error, source: errorSource } = useErrorNotice()
  const { message: vocabularyError, source: vocabularyErrorSource } = useErrorNotice()
  let vocabularyRequest = 0
  let statusRequest = 0

  async function loadVocabulary(): Promise<void> {
    const request = ++vocabularyRequest
    const result = await plotDeviceApi.current().inspector.getVocabulary()
    if (request !== vocabularyRequest) return
    if (result.ok) {
      vocabulary.value = result.value
      vocabularyErrorSource.value = null
    } else vocabularyErrorSource.value = result.error
  }

  /** Adds a status to novel.md's list. */
  async function addStatus(status: string): Promise<void> {
    const request = statusRequest
    const result = await plotDeviceApi.current().manuscript.addStatus(status)
    if (request !== statusRequest) return
    if (!result.ok) {
      errorSource.value = result.error
      return
    }
    if (vocabulary.value !== null)
      vocabulary.value = { ...vocabulary.value, statuses: result.value }
    error.value = null
  }

  function clear(): void {
    vocabularyRequest += 1
    statusRequest += 1
    vocabulary.value = null
    error.value = null
    vocabularyErrorSource.value = null
  }

  return { vocabulary, error, vocabularyError, loadVocabulary, addStatus, clear }
})

// Keep the store's state and pick up changed actions when Vite hot-reloads this file in development.
if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useInspectorStore, import.meta.hot))
