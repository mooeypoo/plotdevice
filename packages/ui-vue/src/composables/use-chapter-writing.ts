import type { HostEvent, Preferences, ProjectView, SaveStatusView } from '@plotdevice/contracts'
import { createChapterEditor, type ChapterEditor, type EditorSettings, type FormatCommand } from '@plotdevice/editor-codemirror'
import { pastedMarkdown } from '@plotdevice/markdown'
import type { ProjectPath } from '@plotdevice/shared'
import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { useApi } from '../api'
import { beforeClosing } from '../closing'
import { useProjectStore } from '../stores/project'
import { useSettingsStore } from '../stores/settings'

/** Autosave starts about a second after typing stops (Milestone 3, decision 1). */
const AUTOSAVE_DELAY_MS = 1000

export type ChapterState = 'none' | 'loading' | 'ready' | 'missing' | 'unreadable'

/**
 * The open chapter in the writing view. One editor lives for the whole session: switching chapters
 * loads new text into it, and settings change in place, so nothing is remounted. Text goes to the
 * host after a pause in typing, and at once on a chapter switch, when the window loses focus, and
 * before the app closes. Each save carries the generation of the text it was typed into.
 */
export function useChapterWriting(host: Ref<HTMLElement | null>, options: { remembersPosition: boolean } = { remembersPosition: true }) {
  const api = useApi()
  const store = useProjectStore()
  const settings = useSettingsStore()
  const file = ref<ProjectPath | null>(null)
  const state = ref<ChapterState>('none')
  /** Typed here but not yet sent to the host. */
  const pending = ref(false)
  let generation = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let editor: ChapterEditor | null = null

  const status = computed<SaveStatusView | null>(() => {
    if (!file.value || state.value !== 'ready') return null
    const hostStatus = store.statuses[file.value] ?? 'saved'
    return hostStatus === 'conflict' || hostStatus === 'failed' || !pending.value ? hostStatus : 'unsaved'
  })

  const editorSettings = (project: ProjectView | null, preferences: Preferences | null): EditorSettings => ({
    projectDirection: project?.direction ?? 'ltr',
    directionMode: 'project',
    language: project?.language ?? preferences?.locale ?? 'en',
    labels: { chapterText: settings.t('chapter-text'), sceneBreak: settings.t('scene-break') },
  })

  function flush(): void {
    clearTimeout(timer)
    if (!pending.value || !file.value || !editor) return
    pending.value = false
    void api.saveChapter({ file: file.value, text: editor.text(), generation })
  }

  /** Where the author left off in Write. Pages edited in Story don't count: Write reopens on a chapter. */
  function rememberPosition(): void {
    if (!options.remembersPosition) return
    if (file.value && editor && state.value === 'ready') void api.leftOff({ file: file.value, cursor: editor.cursor() })
  }

  async function open(next: ProjectPath, cursor = 0): Promise<void> {
    if (next === file.value && state.value === 'ready') return editor?.focus()
    flush()
    rememberPosition()
    file.value = next
    state.value = 'loading'
    const chapter = await api.openChapter(next)
    if (file.value !== next) return // another chapter was chosen meanwhile
    if (!chapter.ok) {
      state.value = chapter.error === 'unreadable' ? 'unreadable' : 'missing'
      return
    }
    generation = chapter.value.generation
    store.statuses = { ...store.statuses, [next]: chapter.value.status }
    editor?.load(chapter.value.text, cursor)
    state.value = 'ready'
    editor?.focus()
  }

  function onHostEvent(event: HostEvent): void {
    if (event.kind === 'chapter-reloaded' && event.file === file.value && editor) {
      // Text typed here but not yet sent belongs to the old version: send it, and the host holds it as a conflict.
      if (pending.value) flush()
      else {
        generation = event.generation
        editor.load(event.text, editor.cursor())
      }
    }
  }

  const resolving = ref(false)

  /** "Keep both" or "Use my version"; afterwards the editor shows the chapter's text and saving resumes. */
  async function resolveConflict(choice: 'keep-both' | 'use-mine'): Promise<void> {
    if (!file.value) return
    resolving.value = true
    const result = await api.resolveConflict({ file: file.value, choice })
    resolving.value = false
    if (!result.ok) {
      store.tell('conflict-failed')
      return
    }
    const { copy, text, project } = result.value
    store.setProject(project)
    if (copy) store.tell('conflict-kept', project.chapters.find((chapter) => chapter.file === copy)?.title ?? copy)
    if (text === null) state.value = 'missing'
    else if (result.value.generation !== generation) editor?.load(text, editor.cursor())
    generation = result.value.generation
  }

  let stopEvents: () => void = () => undefined
  const onBlur = (): void => flush()
  const beforeClose = (): void => {
    flush()
    rememberPosition()
  }

  onMounted(() => {
    if (!host.value) return
    editor = createChapterEditor(host.value, {
      text: '',
      settings: editorSettings(store.project, settings.preferences),
      onChange: () => {
        pending.value = true
        clearTimeout(timer)
        timer = setTimeout(flush, AUTOSAVE_DELAY_MS)
      },
      convertPaste: pastedMarkdown,
    })
    stopEvents = api.onEvent(onHostEvent)
    window.addEventListener('blur', onBlur)
    beforeClosing.add(beforeClose)
  })

  onBeforeUnmount(() => {
    beforeClose()
    beforeClosing.delete(beforeClose)
    stopEvents()
    window.removeEventListener('blur', onBlur)
    editor?.destroy()
    editor = null
  })

  watch(
    () => [store.project?.direction, store.project?.language, settings.locale] as const,
    () => editor?.updateSettings(editorSettings(store.project, settings.preferences)),
  )

  return {
    file,
    state,
    status,
    open,
    flush,
    resolving,
    resolveConflict,
    format: (command: FormatCommand) => editor?.format(command),
    insertLink: (url: string) => editor?.insertLink(url),
    setParagraphDirection: (direction: 'ltr' | 'rtl' | null) => editor?.setParagraphDirection(direction),
    setPhraseDirection: (direction: 'ltr' | 'rtl' | null) => editor?.setPhraseDirection(direction),
    focus: () => editor?.focus(),
  }
}
