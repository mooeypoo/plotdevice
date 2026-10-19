import { computed, ref, watch, type ComputedRef, type Ref } from 'vue'
import { useCodexStore } from '../../app/codex-store'
import { useEditorStore } from '../../app/editor-store'
import { useManuscriptStore } from '../../app/manuscript-store'
import { choiceFor, linkChoices, nameKey } from '../../shared/link-choices'

/** One relationship as the editor shows it. `target` is the link text inside `[[…]]`. */
export interface RelationshipRow {
  target: string
  kind: string
  note: string
}

/** A character the open one can have a relationship with. */
export interface CharacterOption {
  readonly target: string
  readonly label: string
}

/** Editing the open character's relationships: rows, choices, and saving. */
export function useRelationships(): {
  readonly rows: Ref<RelationshipRow[]>
  readonly characters: ComputedRef<readonly CharacterOption[]>
  readonly add: () => void
  readonly remove: (index: number) => Promise<void>
  readonly save: () => Promise<void>
} {
  const codex = useCodexStore()
  const editor = useEditorStore()
  const manuscript = useManuscriptStore()
  const rows = ref<RelationshipRow[]>([])

  const choices = computed(() => linkChoices(manuscript.manuscript?.linkTargets ?? []))
  const titles = computed(
    () => new Map((codex.listing?.entries ?? []).map((entry) => [entry.path, entry.title]))
  )

  watch(
    () => codex.properties,
    (properties) => {
      rows.value = (properties?.relationships ?? []).map((relationship) => {
        const written = /^\[\[([^\]|#]*)/u.exec(relationship.with)?.[1] ?? relationship.with
        return {
          target: choiceFor(choices.value, written)?.target ?? written,
          kind: relationship.kind ?? '',
          note: relationship.note ?? ''
        }
      })
    },
    { immediate: true }
  )

  const characters = computed<readonly CharacterOption[]>(() => {
    const self = editor.entry?.path
    const options = choices.value
      .filter((choice) => choice.type === 'character' && choice.path !== self)
      .map((choice) => ({
        target: choice.target,
        label: titles.value.get(choice.path) ?? choice.name
      }))
    // A relationship to someone without a file is kept as written.
    const known = new Set(options.map((option) => nameKey(option.target)))
    const unknown = rows.value
      .filter((row) => row.target !== '' && !known.has(nameKey(row.target)))
      .map((row) => ({ target: row.target, label: `${row.target} (no file)` }))
    return [...options, ...unknown].sort((a, b) => a.label.localeCompare(b.label))
  })

  async function save(): Promise<void> {
    await codex.updateRelationships(
      rows.value
        .filter((row) => row.target !== '')
        .map((row) => ({ with: row.target, kind: row.kind, note: row.note }))
    )
  }

  return {
    rows,
    characters,
    add: () => {
      rows.value = [...rows.value, { target: '', kind: '', note: '' }]
    },
    remove: async (index) => {
      rows.value = rows.value.filter((_, position) => position !== index)
      await save()
    },
    save
  }
}
