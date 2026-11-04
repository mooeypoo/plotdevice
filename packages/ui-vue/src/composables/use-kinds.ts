import { builtInKindKey, kindLabels, kindOrder, unsortedFolders } from '@plotdevice/presentation'
import { computed } from 'vue'
import { useProjectStore } from '../stores/project'
import { useSettingsStore } from '../stores/settings'
import { useStoryStore } from '../stores/story'

/** A book with no `kinds` in `project.md`: what every book had before Milestone 18. */
const DEFAULTS = [{ folder: 'characters' }, { folder: 'places' }, { folder: 'notes' }]

/**
 * The open book's kinds of pages (ADR 0011): their order, their names in the interface, the folders it
 * doesn't list ("Not sorted yet"), and a colour for each on the shelf.
 */
export function useKinds() {
  const project = useProjectStore()
  const story = useStoryStore()
  const settings = useSettingsStore()
  const kinds = computed(() => project.project?.kinds ?? DEFAULTS)
  const unsorted = computed(() => unsortedFolders(kinds.value, story.references))
  const order = computed(() => kindOrder(kinds.value, story.references))
  const labels = (folder: string) => kindLabels(kinds.value, folder, settings.t)
  const listed = (folder: string): boolean => kinds.value.some((kind) => kind.folder === folder)

  /** One word for what a search result or link is: "Character", "NPC", "Chapter". */
  function kindWord(kind: string): string {
    if (kind === 'chapter' || kind === 'outline' || kind === 'other') return settings.t(`kind-${kind}`)
    return labels(kind).one
  }

  /**
   * The shelf's colour for a kind: the default kinds keep theirs; the book's own take the plot colours
   * in turn. Always beside the kind's name, never the only cue (DESIGN_SYSTEM.md).
   */
  function colourClass(folder: string): string {
    const key = builtInKindKey(folder)
    if (key !== null) return `kind-${key}`
    const at = kinds.value.findIndex((kind) => kind.folder === folder)
    return `kind-plot-${(at < 0 ? 0 : at) % 3}`
  }

  return { kinds, unsorted, order, labels, listed, kindWord, colourClass }
}
