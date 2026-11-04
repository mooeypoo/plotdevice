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
    if (kind === 'chapter') return chapters.one()
    if (kind === 'outline' || kind === 'other') return settings.t(`kind-${kind}`)
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

  /**
   * What this book calls a chapter (ADR 0011, `manuscriptUnit`): "Session 3", "New session". Only the
   * prominent words change (Milestone 18, open question 2); files and contents never do.
   */
  const unit = computed(() => project.project?.manuscriptUnit ?? null)
  const chapters = {
    one: (): string => unit.value?.one ?? settings.t('kind-chapter'),
    many: (): string => unit.value?.many ?? settings.t('navigator-label'),
    number: (n: number): string => (unit.value ? `${unit.value.one} ${n}` : settings.t('chapter-number', n)),
    add: (): string => (unit.value ? settings.t('navigator-new-unit', unit.value.one) : settings.t('navigator-new-chapter')),
    none: (): string => (unit.value ? settings.t('gallery-empty-kind', unit.value.many) : settings.t('write-empty-title')),
    noneText: (): string => (unit.value ? settings.t('write-empty-unit-text') : settings.t('write-empty-text')),
  }

  return { kinds, unsorted, order, labels, listed, kindWord, colourClass, chapters }
}
