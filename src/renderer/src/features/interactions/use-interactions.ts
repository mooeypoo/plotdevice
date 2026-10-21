import {
  computed,
  onScopeDispose,
  ref,
  shallowRef,
  watch,
  type ComputedRef,
  type Ref,
  type ShallowRef
} from 'vue'
import type { InteractionsDto } from '../../../../contract/dtos'
import { useCodexStore } from '../../app/codex-store'
import { useEditorStore } from '../../app/editor-store'
import { useLayoutStore } from '../../app/layout-store'
import { useManuscriptStore } from '../../app/manuscript-store'
import { plotDeviceApi } from '../../app/plot-device-api'
import { useErrorNotice } from '../../shared/use-error-notice'
import {
  interactionMatrix,
  type CharacterOrder,
  type InteractionMatrix
} from './interaction-matrix'

/** The pair the writer picked, by row and column in the matrix. */
export interface PickedPair {
  readonly row: number
  readonly column: number
}

/** The interactions view: its data, the matrix, the picked pair, and opening a chapter. */
export function useInteractions(): {
  readonly interactions: ShallowRef<InteractionsDto | null>
  readonly error: Ref<string | null>
  readonly order: Ref<CharacterOrder>
  readonly matrix: ComputedRef<InteractionMatrix | null>
  readonly picked: Ref<PickedPair | null>
  readonly open: (path: string) => Promise<void>
} {
  const manuscript = useManuscriptStore()
  const codex = useCodexStore()
  const editor = useEditorStore()
  const layout = useLayoutStore()
  const interactions = shallowRef<InteractionsDto | null>(null)
  const { message: error, source: errorSource } = useErrorNotice()
  let request = 0
  onScopeDispose(() => {
    request += 1
  })
  const order = ref<CharacterOrder>('name')
  const picked = ref<PickedPair | null>(null)

  async function load(): Promise<void> {
    const identity = ++request
    const result = await plotDeviceApi.current().interactions.getInteractions()
    if (identity !== request) return
    if (result.ok) {
      interactions.value = result.value
      errorSource.value = null
    } else errorSource.value = result.error
  }
  // Follow the manuscript and codex, which reload whenever files change.
  watch([() => manuscript.manuscript, () => codex.revision], () => void load(), { immediate: true })
  // A new order moves every row; a picked pair no longer means the same two people.
  watch(order, () => {
    picked.value = null
  })

  return {
    interactions,
    error,
    order,
    matrix: computed(() =>
      interactions.value === null ? null : interactionMatrix(interactions.value, order.value)
    ),
    picked,
    open: async (path) => {
      if (await editor.open(path)) layout.mainView = 'write'
    }
  }
}
