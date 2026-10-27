import { linkTargets, markdownLink, search, suggestedLinkTargets, type LinkTarget } from '@plotdevice/presentation'
import { dirnameOf } from '@plotdevice/shared'
import { computed, ref, watch } from 'vue'
import { useProjectStore } from '../stores/project'
import { useStoryStore } from '../stores/story'

export interface LinkQuery {
  text: string
  x: number
  y: number
}

/**
 * The pages and chapters offered while `@name` (or `[[name`) is typed in an outline: in a card's text
 * and in the outline's Text view. `insert` puts the chosen link's Markdown in place of the name.
 */
export function useLinkSuggestions(insert: (markdown: string) => void) {
  const project = useProjectStore()
  const story = useStoryStore()
  const query = ref<LinkQuery | null>(null)
  const selected = ref(0)
  const targets = computed<LinkTarget[]>(() => (project.project ? linkTargets(project.project, story.references) : []))
  const offered = computed<LinkTarget[]>(() => {
    const typed = query.value?.text.trim()
    if (typed === undefined) return []
    if (typed === '') return suggestedLinkTargets(targets.value, 3).flatMap((group) => group.targets)
    return search(targets.value, typed).slice(0, 8)
  })
  const open = computed(() => offered.value.length > 0)
  watch(offered, () => (selected.value = 0))

  /** A link from the open outline to `target`, relative to the outline's folder. */
  const linkFor = (target: LinkTarget): string => markdownLink(dirnameOf(story.outline?.file ?? 'outlines/x.md'), target.file, target.title)

  function choose(target: LinkTarget | undefined): void {
    if (!target) return
    insert(linkFor(target))
    query.value = null
  }

  /** For the editor's keys while pages are offered: returns `true` when it used the key. */
  function onListKey(key: 'up' | 'down' | 'pick' | 'close'): boolean {
    if (!open.value) return false
    if (key === 'down') selected.value = Math.min(selected.value + 1, offered.value.length - 1)
    else if (key === 'up') selected.value = Math.max(selected.value - 1, 0)
    else if (key === 'pick') choose(offered.value[selected.value])
    else query.value = null
    return true
  }

  return { query, selected, offered, open, linkFor, choose, onListKey }
}
