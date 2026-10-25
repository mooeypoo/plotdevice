import type { OutlineItemView } from '@plotdevice/contracts'
import { uiDirection } from '@plotdevice/i18n'
import { cardMoves, keyOf, markdownLink, type ItemAt, type ItemDestination } from '@plotdevice/presentation'
import { dirnameOf } from '@plotdevice/shared'
import { nextTick, ref } from 'vue'
import type { MenuItem } from '../components/menu'
import { useStoryStore } from '../stores/story'
import { useSettingsStore } from '../stores/settings'
import { useConfirm } from './use-confirm'
import { useLinkPicker } from './use-link-picker'
import { usePrompt } from './use-prompt'

/** The card being dragged, shared by every view. */
const dragging = ref<ItemAt | null>(null)

/** Moves the keyboard focus to an item once the outline has been redrawn. */
async function focusItem(key: string): Promise<void> {
  await nextTick()
  document.querySelector<HTMLElement>(`[data-item="${CSS.escape(key)}"]`)?.focus()
}

/**
 * Everything an author can do to an outline from its views: menus, keyboard moves (Alt+Arrow keys,
 * following the interface direction), drag and drop, and editing in place. Every change goes through
 * the story store, which explains any refusal.
 */
export function useOutlineActions() {
  const story = useStoryStore()
  const settings = useSettingsStore()
  const { ask } = usePrompt()
  const { confirm } = useConfirm()
  const { pick } = useLinkPicker()
  const t = settings.t

  /** "Link to…": the link goes at the end of the item's text, as ordinary Markdown (Milestone 5, decision 5). */
  async function linkTo(at: ItemAt, item: OutlineItemView): Promise<void> {
    const outline = story.outline
    const target = await pick()
    if (!outline || !target) return
    await story.edit({ kind: 'rename-item', at, text: `${item.text} ${markdownLink(dirnameOf(outline.file), target.file, target.title)}` })
    await focusItem(keyOf(at))
  }

  async function move(from: ItemAt, to: ItemDestination | null): Promise<void> {
    if (!to) return
    if (await story.edit({ kind: 'move-item', from, to })) await focusItem(keyOf({ section: to.section, path: [...to.parentPath, to.index] }))
  }

  async function remove(at: ItemAt, item: OutlineItemView): Promise<void> {
    if (await confirm(t('confirm-delete-item', item.text), t('confirm-delete'))) await story.edit({ kind: 'delete-item', at })
  }

  async function addDetail(at: ItemAt, item: OutlineItemView): Promise<void> {
    const text = await ask(t('prompt-detail-text'))
    if (text) await story.edit({ kind: 'add-item', to: { section: at.section, parentPath: at.path, index: item.children.length }, text })
  }

  function itemMenu(at: ItemAt, item: OutlineItemView): MenuItem[] {
    const outline = story.outline
    if (!outline) return []
    const moves = cardMoves(outline, at)
    const isCard = at.path.length === 1
    const otherSections = isCard
      ? outline.sections.flatMap((section, index) =>
          index === at.section || section.name === null
            ? []
            : [{ key: `move-to-${index}`, label: t('move-to-section', section.name), run: () => void move(at, { section: index, parentPath: [], index: section.items.length }) }],
        )
      : []
    return [
      { key: 'edit', label: t('item-edit'), run: () => (story.editing = { kind: 'item', key: keyOf(at) }) },
      { key: 'add-detail', label: t('outline-add-detail'), run: () => void addDetail(at, item) },
      { key: 'link-to', label: t('link-to'), run: () => void linkTo(at, item) },
      { key: 'move-earlier', label: t('item-move-earlier'), group: 'move', disabled: !moves.earlier, run: () => void move(at, moves.earlier) },
      { key: 'move-later', label: t('item-move-later'), disabled: !moves.later, run: () => void move(at, moves.later) },
      ...otherSections.map((entry) => ({ ...entry, disabled: !item.movable })),
      { key: 'delete', label: t('item-delete'), group: 'delete', disabled: !item.movable, run: () => void remove(at, item) },
    ]
  }

  function sectionMenu(index: number): MenuItem[] {
    const outline = story.outline
    const section = outline?.sections[index]
    if (!outline || !section || section.name === null) return []
    const name = section.name
    const firstNamed = outline.sections[0]?.name === null ? 1 : 0
    return [
      { key: 'rename-section', label: t('section-rename'), run: () => (story.editing = { kind: 'section', section: index }) },
      { key: 'add-card', label: t('outline-add-card'), run: () => (story.editing = { kind: 'new-card', section: index }) },
      { key: 'section-earlier', label: t('section-move-earlier'), group: 'move', disabled: index <= firstNamed, run: () => void story.edit({ kind: 'move-section', section: index, index: index - 1 }) },
      { key: 'section-later', label: t('section-move-later'), disabled: index >= outline.sections.length - 1, run: () => void story.edit({ kind: 'move-section', section: index, index: index + 1 }) },
      {
        key: 'delete-section',
        label: t('section-delete'),
        group: 'delete',
        run: async () => {
          if (await confirm(t('confirm-delete-section', name), t('confirm-delete'))) await story.edit({ kind: 'delete-section', section: index })
        },
      },
    ]
  }

  /** Alt+Up/Down move an item; Alt+Left/Right move a card between sections, mirrored in right-to-left. */
  function onItemKey(event: KeyboardEvent, at: ItemAt, item: OutlineItemView): void {
    const outline = story.outline
    if (!outline || story.editing) return
    const moves = cardMoves(outline, at)
    const rtl = uiDirection(settings.locale) === 'rtl'
    const towardsStart = rtl ? 'ArrowRight' : 'ArrowLeft'
    const towardsEnd = rtl ? 'ArrowLeft' : 'ArrowRight'
    if (event.altKey && event.key === 'ArrowUp') void move(at, moves.earlier)
    else if (event.altKey && event.key === 'ArrowDown') void move(at, moves.later)
    else if (event.altKey && event.key === towardsStart) void move(at, moves.previousSection)
    else if (event.altKey && event.key === towardsEnd) void move(at, moves.nextSection)
    else if (event.key === 'Enter' || event.key === 'F2') story.editing = { kind: 'item', key: keyOf(at) }
    else if (event.key === 'Delete' && item.movable) void remove(at, item)
    else return
    event.preventDefault()
  }

  async function commitItem(at: ItemAt, item: OutlineItemView, text: string | null): Promise<void> {
    story.editing = null
    if (text !== null && text.trim() !== '' && text !== item.text) await story.edit({ kind: 'rename-item', at, text })
    await focusItem(keyOf(at))
  }

  async function commitSection(section: number, text: string | null): Promise<void> {
    const current = story.outline?.sections[section]?.name
    story.editing = null
    if (text !== null && text.trim() !== '' && text !== current) await story.edit({ kind: 'rename-section', section, text })
  }

  async function commitNewCard(section: number, text: string | null): Promise<void> {
    story.editing = null
    const index = story.outline?.sections[section]?.items.length ?? 0
    if (text && text.trim() !== '' && (await story.edit({ kind: 'add-item', to: { section, parentPath: [], index }, text }))) {
      story.editing = { kind: 'new-card', section } // keep adding, as in a list
    }
  }

  async function commitNewSection(text: string | null): Promise<void> {
    story.editing = null
    const index = story.outline?.sections.length ?? 0
    if (text && text.trim() !== '') await story.edit({ kind: 'add-section', index, text })
  }

  async function renameOutline(): Promise<void> {
    const title = await ask(t('prompt-outline-title'), story.outline?.title ?? '')
    if (title) await story.edit({ kind: 'set-title', text: title })
  }

  // Drag and drop: the dragged card goes before the card it is dropped on, or to the end of a section.
  function dragStart(event: DragEvent, at: ItemAt): void {
    dragging.value = at
    event.dataTransfer?.setData('text/plain', keyOf(at))
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
  }

  function dropBefore(target: ItemAt): void {
    const from = dragging.value
    dragging.value = null
    const index = target.path[0] ?? 0
    if (!from) return
    const sameList = from.path.length === 1 && from.section === target.section
    void move(from, { section: target.section, parentPath: [], index: sameList && (from.path[0] ?? 0) < index ? index - 1 : index })
  }

  function dropAtEnd(section: number): void {
    const from = dragging.value
    dragging.value = null
    if (!from) return
    const count = story.outline?.sections[section]?.items.length ?? 0
    void move(from, { section, parentPath: [], index: count - (from.path.length === 1 && from.section === section ? 1 : 0) })
  }

  return { itemMenu, sectionMenu, onItemKey, commitItem, commitSection, commitNewCard, commitNewSection, renameOutline, dragStart, dropBefore, dropAtEnd, dragging }
}
