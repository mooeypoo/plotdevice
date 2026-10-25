import type { OutlineEditRequest, OutlineProblem, OutlineResult, OutlineSummaryView, OutlineView } from '@plotdevice/contracts'
import type { ProjectPath } from '@plotdevice/shared'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useApi } from '../api'
import { useProjectStore } from './project'

/** What is being typed in place: an item's text, a section's name, or a new card or section. */
export type Editing =
  | { kind: 'item'; key: string }
  | { kind: 'section'; section: number }
  | { kind: 'new-card'; section: number }
  | { kind: 'new-section' }
  | null

const MESSAGE: Partial<Record<OutlineProblem, string>> = {
  'changed-elsewhere': 'outline-changed-elsewhere',
  'unmovable-item': 'locked-item',
  'unnamed-section': 'outline-refused-unnamed-section',
  'multiline-heading': 'outline-refused-multiline-heading',
}

/** The Story workspace (working name): the project's outlines and the one open now. */
export const useStoryStore = defineStore('story', () => {
  const api = useApi()
  const project = useProjectStore()
  const outlines = ref<OutlineSummaryView[]>([])
  const outline = ref<OutlineView | null>(null)
  const collapsed = ref(new Set<string>())
  const editing = ref<Editing>(null)

  async function refresh(): Promise<void> {
    outlines.value = await api.listOutlines()
  }

  /** Shows the outline, or tells the author why not. Returns whether it worked. */
  function settle(result: OutlineResult, refused = 'outline-failed'): boolean {
    if (result.ok) {
      outline.value = result.value
      return true
    }
    // An empty name is simply nothing to do; the rest are explained.
    if (result.error !== 'empty-text') project.tell(MESSAGE[result.error] ?? refused)
    return false
  }

  async function open(file: ProjectPath): Promise<void> {
    if (outline.value?.file !== file) collapsed.value = new Set()
    settle(await api.openOutline(file))
  }

  async function create(title: string): Promise<void> {
    if (settle(await api.createOutline(title))) await refresh()
  }

  async function edit(request: OutlineEditRequest): Promise<boolean> {
    if (!outline.value) return false
    // A plain copy: positions taken from the reactive outline are proxies, which can't cross to the host.
    const done = settle(await api.editOutline(outline.value.file, JSON.parse(JSON.stringify(request)) as OutlineEditRequest))
    if (done && (request.kind === 'set-title' || request.kind === 'add-section')) await refresh()
    return done
  }

  async function undo(): Promise<void> {
    if (!outline.value) return
    const result = await api.undoOutline(outline.value.file)
    // When another app changed the file, the outline has already been reloaded (`outline-changed`).
    if (result.ok) outline.value = result.value
    else project.tell(result.error === 'changed-elsewhere' ? 'outline-undo-refused' : 'outline-failed')
  }

  function toggle(key: string): void {
    const next = new Set(collapsed.value)
    if (!next.delete(key)) next.add(key)
    collapsed.value = next
  }

  api.onEvent((event) => {
    if (event.kind === 'outline-changed' && event.outline.file === outline.value?.file) outline.value = event.outline
  })

  return { outlines, outline, collapsed, editing, refresh, open, create, edit, undo, toggle }
})
