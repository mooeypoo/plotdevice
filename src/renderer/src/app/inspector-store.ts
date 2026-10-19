import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import type { InspectorVocabularyDto, StoryDateCheckDto } from '../../../contract/dtos'
import { plotDeviceApi } from './plot-device-api'

/** The inspector's choices (statuses, threads, calendar) for the open project. */
export const useInspectorStore = defineStore('inspector', () => {
  const vocabulary = shallowRef<InspectorVocabularyDto | null>(null)
  const error = ref<string | null>(null)

  async function loadVocabulary(): Promise<void> {
    const result = await plotDeviceApi.current().inspector.getVocabulary()
    if (result.ok) vocabulary.value = result.value
    else error.value = result.error.message
  }

  /** Adds a status to novel.md's list. */
  async function addStatus(status: string): Promise<void> {
    const result = await plotDeviceApi.current().manuscript.addStatus(status)
    if (!result.ok) {
      error.value = result.error.message
      return
    }
    if (vocabulary.value !== null)
      vocabulary.value = { ...vocabulary.value, statuses: result.value }
  }

  /** Checks a story date as typed, under the project's calendar. */
  async function checkStoryDate(text: string): Promise<StoryDateCheckDto | undefined> {
    const result = await plotDeviceApi.current().inspector.checkStoryDate(text)
    return result.ok ? result.value : undefined
  }

  function clear(): void {
    vocabulary.value = null
    error.value = null
  }

  return { vocabulary, error, loadVocabulary, addStatus, checkStoryDate, clear }
})
