import { watch } from 'vue'
import { useApi } from '../api'
import { useProjectStore } from '../stores/project'
import { useStoryStore } from '../stores/story'
import { useViewStore } from '../stores/view'

/**
 * Returns the author to the workspace, outline and view they were in (PRD G2), and remembers each
 * change. Saved by internal IDs only, never by the workspace's displayed name.
 */
export function useRememberedPlace(): void {
  const api = useApi()
  const project = useProjectStore()
  const story = useStoryStore()
  const view = useViewStore()

  watch(
    () => project.project?.root,
    async (root) => {
      story.outline = null
      story.showing = { kind: 'outline' }
      if (!root) return
      const place = project.opened?.place
      view.workspace = place?.workspace ?? 'write'
      view.outlineView = place?.view ?? 'board'
      await story.refresh()
      void story.checkTags()
      const outline = story.outlines.find((entry) => entry.file === place?.outline) ?? story.outlines[0]
      if (outline) await story.open(outline.file)
    },
    { immediate: true },
  )

  watch(
    () => [view.workspace, story.outline?.file, view.outlineLayout] as const,
    ([workspace, outline, kind]) => {
      if (project.project) void api.rememberPlace({ workspace, ...(outline ? { outline } : {}), view: kind })
    },
  )
}
