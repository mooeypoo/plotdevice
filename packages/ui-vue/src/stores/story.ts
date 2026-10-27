import type {
  OutlineEditRequest,
  OutlineProblem,
  OutlineResult,
  OutlineSummaryView,
  OutlineView,
  ReferenceKind,
  ReferenceSummaryView,
  RelationshipChangeRequest,
} from '@plotdevice/contracts'
import { cardKey, type ItemDestination } from '@plotdevice/presentation'
import type { ProjectPath } from '@plotdevice/shared'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useApi } from '../api'
import { useProjectStore } from './project'

/**
 * What is being typed in place: an item's text, a section's name, a new card on the board, a new line
 * in the list (with what was typed so far, kept when Tab moves it), or a new section.
 */
export type Editing =
  | { kind: 'item'; key: string }
  | { kind: 'section'; section: number }
  | { kind: 'new-card'; section: number }
  | { kind: 'new-line'; to: ItemDestination; draft: string }
  | { kind: 'new-section' }
  | null

export type Showing =
  { kind: 'outline' } | { kind: 'gallery'; of: ReferenceKind } | { kind: 'page'; file: ProjectPath } | { kind: 'manuscript' }

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
  const references = ref<ReferenceSummaryView[]>([])
  /** What the Story workspace shows: an outline, one kind of page as a gallery, one page, or the book's chapters. */
  const showing = ref<Showing>({ kind: 'outline' })
  /** The tags chosen above each gallery, which group it (Milestone 12); for this session only. */
  const galleryTags = ref<Partial<Record<ReferenceKind, string[]>>>({})
  /** "Show on the board": the open outline's cards that link to a page stand out, and the rest fade. */
  const about = ref<{ file: ProjectPath; title: string; cards: Set<string> } | null>(null)

  async function refresh(): Promise<void> {
    ;[outlines.value, references.value] = await Promise.all([api.listOutlines(), api.listReferences()])
  }

  async function createReference(kind: ReferenceKind, title: string): Promise<void> {
    const created = await api.createReference(kind, title)
    if (!created.ok) {
      if (created.error !== 'empty-text') project.tell('reference-failed')
      return
    }
    await refresh()
    showing.value = { kind: 'page', file: created.value.file }
  }

  /** Renames a page's file; the page view follows it to its new name. */
  async function renameReferenceFile(file: ProjectPath, newName: string): Promise<void> {
    const renamed = await api.renameReferenceFile(file, newName)
    if (!renamed.ok) {
      if (renamed.error === 'name-taken' || renamed.error === 'invalid-name') project.tell(`change-failed-${renamed.error}`)
      else if (renamed.error !== 'empty-text') project.tell('reference-failed')
      return
    }
    await refresh()
    if (showing.value.kind === 'page' && showing.value.file === file) showing.value = { kind: 'page', file: renamed.value.file }
  }

  async function renameReference(file: ProjectPath, title: string): Promise<void> {
    const renamed = await api.renameReference(file, title)
    if (!renamed.ok && renamed.error !== 'empty-text') project.tell('reference-failed')
    await refresh()
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
    showing.value = { kind: 'outline' }
    if (outline.value?.file !== file) {
      collapsed.value = new Set()
      about.value = null
    }
    settle(await api.openOutline(file))
  }

  /** A new outline; `about` a page (a character's arc), which the outline starts by linking to. */
  async function create(title: string, aboutPage?: ProjectPath): Promise<void> {
    showing.value = { kind: 'outline' }
    about.value = null
    if (settle(await api.createOutline(title, aboutPage))) await refresh()
  }

  /** Opens `file` on the board with the cards that link to `page` picked out. */
  async function showOnBoard(file: ProjectPath, page: { file: ProjectPath; title: string }): Promise<void> {
    const linked = await api.linkedFrom(page.file)
    await open(file)
    if (outline.value?.file !== file) return
    const cards = linked.cards.filter((card) => card.outline === file).map((card) => cardKey(card.section, card.card))
    about.value = { file: page.file, title: page.title, cards: new Set(cards) }
  }

  /** Adds, rewords or removes one relationship on a page; tells the author when it couldn't be done. */
  async function editRelationship(file: ProjectPath, change: RelationshipChangeRequest): Promise<boolean> {
    const result = await api.editRelationship(file, change)
    await refresh()
    if (!result.ok && result.error !== 'empty-text')
      project.tell(result.error === 'stale' ? 'relationship-changed-elsewhere' : 'reference-failed')
    return result.ok
  }

  /** Tag changes, one at a time, so a quick second change never starts from the tags before the first. */
  let tagging: Promise<unknown> = Promise.resolve()

  /** Sets a page's tags; tells the author when it couldn't be done. */
  function setTags(file: ProjectPath, tags: string[]): Promise<boolean> {
    const run = tagging.then(() => writeTags(file, tags))
    tagging = run.catch(() => undefined)
    return run
  }

  async function writeTags(file: ProjectPath, tags: string[]): Promise<boolean> {
    const result = await api.setTags(file, [...tags])
    await refresh()
    if (!result.ok)
      project.tell(
        result.error === 'unreadable' ? 'tags-unreadable' : result.error === 'stale' ? 'relationship-changed-elsewhere' : 'tags-failed',
      )
    return result.ok
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

  /** Shows what is inside an item, if it was folded. */
  function expand(key: string): void {
    if (!collapsed.value.has(key)) return
    const next = new Set(collapsed.value)
    next.delete(key)
    collapsed.value = next
  }

  function toggle(key: string): void {
    const next = new Set(collapsed.value)
    if (!next.delete(key)) next.add(key)
    collapsed.value = next
  }

  api.onEvent((event) => {
    if (event.kind === 'outline-changed' && event.outline.file === outline.value?.file) outline.value = event.outline
    else if (event.kind === 'references-changed') void refresh()
  })

  return {
    outlines,
    outline,
    collapsed,
    editing,
    references,
    showing,
    galleryTags,
    about,
    refresh,
    showOnBoard,
    editRelationship,
    setTags,
    open,
    create,
    edit,
    undo,
    toggle,
    expand,
    createReference,
    renameReference,
    renameReferenceFile,
  }
})
