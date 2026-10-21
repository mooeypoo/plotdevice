import { computed, nextTick, watch } from 'vue'
import { placeOf } from './entry-owners'
import { useDocumentTabsStore } from './document-tabs-store'
import { useEditorStore } from './editor-store'
import { useLayoutStore } from './layout-store'
import { useShortcuts } from './use-shortcuts'

/** Document-tab presentation, keyboard commands and guarded navigation through the editor. */
export function useDocumentTabs() {
  const tabs = useDocumentTabsStore()
  const editor = useEditorStore()
  const layout = useLayoutStore()
  const documents = computed(() => {
    return tabs.ordered.map((tab) => {
      const place = placeOf(tab.path)
      return {
        ...tab,
        title: place?.title ?? tab.path,
        kind: place?.kind,
        writing: tab.path === tabs.writingPath,
        active: editor.entry?.path === tab.path && layout.mainView === 'write',
        unavailable: place === undefined
      }
    })
  })
  const active = computed(() => documents.value.find((tab) => tab.path === editor.entry?.path))
  const busy = computed(() => editor.navigationBusy || editor.recoveryBusy)
  const canWriteHere = computed(
    () => active.value?.kind === 'chapter' || active.value?.kind === 'part'
  )

  async function activateTab(path: string, event: MouseEvent): Promise<void> {
    const button = event.currentTarget
    const keyboard = event.detail === 0
    if (!(await editor.open(path))) return
    await nextTick()
    if (keyboard && button instanceof HTMLElement) button.focus({ preventScroll: true })
  }

  async function returnToWriting(): Promise<void> {
    if (!(await editor.returnToWriting())) return
    await nextTick()
    document.querySelector<HTMLElement>('.cm-content')?.focus({ preventScroll: true })
  }

  useShortcuts([
    {
      key: 'Tab',
      mod: true,
      run: () => {
        void editor.cycleDocument(1)
      }
    },
    {
      key: 'Tab',
      mod: true,
      shift: true,
      run: () => {
        void editor.cycleDocument(-1)
      }
    },
    {
      key: 'Enter',
      mod: true,
      shift: true,
      run: () => {
        void returnToWriting()
      }
    },
    {
      key: 'w',
      mod: true,
      run: () => {
        const path = editor.entry?.path
        if (path !== undefined) void editor.closeDocument(path)
      }
    }
  ])
  watch(
    () => editor.entry?.path,
    async () => {
      await nextTick()
      document
        .querySelector('[role="tab"][data-document-active="true"]')
        ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    }
  )

  return { documents, active, busy, canWriteHere, activateTab, returnToWriting }
}
