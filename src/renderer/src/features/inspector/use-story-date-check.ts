import { onScopeDispose, shallowRef, watch } from 'vue'
import type { StoryDateCheckDto } from '../../../../contract/dtos'
import { plotDeviceApi } from '../../app/plot-device-api'
import { useInspectorStore } from '../../app/inspector-store'
import { useErrorNotice } from '../../shared/use-error-notice'

/** Checks the current document's date draft, keeping query failures distinct from invalid dates. */
export function useStoryDateCheck(text: () => string, path: () => string | undefined) {
  const inspector = useInspectorStore()
  const reading = shallowRef<StoryDateCheckDto>()
  const { message: error, source: errorSource } = useErrorNotice()
  let request = 0
  watch(
    [text, path, () => inspector.vocabulary?.calendar],
    async ([value, currentPath, calendar]) => {
      const identity = ++request
      reading.value = undefined
      errorSource.value = null
      if (value.trim() === '' || currentPath === undefined) return
      const result = await plotDeviceApi.current().inspector.checkStoryDate(value)
      if (
        identity !== request ||
        text() !== value ||
        path() !== currentPath ||
        inspector.vocabulary?.calendar !== calendar
      )
        return
      if (result.ok) reading.value = result.value
      else errorSource.value = result.error
    },
    { immediate: true }
  )
  onScopeDispose(() => {
    request += 1
  })
  return { reading, error }
}
