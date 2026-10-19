import { onBeforeUnmount, onMounted } from 'vue'
import type { ProjectChangeDto } from '../../../contract/dtos'
import { useInspectorStore } from './inspector-store'
import { useManuscriptStore } from './manuscript-store'
import { plotDeviceApi } from './plot-device-api'
import { useWorkspaceStore } from './workspace-store'

/**
 * Keeps the open project in step with edits made in other programs while it's open: the binder,
 * the warnings, the open chapter, and (when novel.md changes) the inspector's choices.
 */
export function useLiveSync(): void {
  const workspace = useWorkspaceStore()
  const manuscript = useManuscriptStore()
  const inspector = useInspectorStore()
  let stop: (() => void) | undefined
  // One batch at a time, in order, so a slow re-read never overtakes a newer one.
  let queue: Promise<void> = Promise.resolve()

  async function apply(changes: readonly ProjectChangeDto[]): Promise<void> {
    await workspace.refresh()
    await manuscript.syncFromDisk(changes)
    if (changes.some((change) => change.path === 'novel.md')) await inspector.loadVocabulary()
  }

  onMounted(() => {
    stop = plotDeviceApi.current().workspace.onProjectChanged((changes) => {
      queue = queue.then(() => apply(changes))
    })
  })

  onBeforeUnmount(() => {
    stop?.()
  })
}
