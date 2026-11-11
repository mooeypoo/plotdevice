import type { ChapterPosition, HostEvent, Preferences, ProjectView, SaveStatusView } from '@plotdevice/contracts'
import {
  createChapterEditor,
  type ChapterEditor,
  type EditorMode,
  type EditorSettings,
  type FoldedSection,
  type FormatCommand,
  type LinkReport,
  type LinkSuggestionOptions,
  type NiqqudReport,
  type OutlineTextOptions,
  type SelectionPlace,
} from '@plotdevice/editor-codemirror'
import { firstLineOf, pastedMarkdown } from '@plotdevice/markdown'
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
export function useChapterWriting(
  host: Ref<HTMLElement | null>,
  options: {
    remembersPosition: boolean
    foldedSection?: FoldedSection
    outline?: OutlineTextOptions
    links?: LinkSuggestionOptions
    label?: () => string
  } = {
    remembersPosition: true,
  },
) {
  const api = useApi()
  const store = useProjectStore()
  const settings = useSettingsStore()
  const file = ref<ProjectPath | null>(null)
  const state = ref<ChapterState>('none')
  /** Where selected text is on screen, for the formatting bubble. */
  const selection = ref<SelectionPlace | null>(null)
  /** Typed here but not yet sent to the host. */
  const pending = ref(false)
  /**
   * Rendered or plain text (ADR 0010). Plain text lasts until "Back to normal view" or until another
   * file opens; then the setting decides (Milestone 16, decision 8).
   */
  const defaultMode = (): EditorMode => (settings.preferences?.plainTextByDefault ? 'plain' : 'rendered')
  const mode = ref<EditorMode>(defaultMode())
  /** The link the cursor is in, for the link popup. */
  const link = ref<LinkReport | null>(null)
  function setMode(next: EditorMode): void {
    mode.value = next
    editor?.setMode(next)
  }
  let generation = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let editor: ChapterEditor | null = null

  const status = computed<SaveStatusView | null>(() => {
    if (!file.value || state.value !== 'ready') return null
    const hostStatus = store.statuses[file.value] ?? 'saved'
    return hostStatus === 'conflict' || hostStatus === 'failed' || !pending.value ? hostStatus : 'unsaved'
  })

  /** Prose or a poem (ADR 0013): only chapters have a form; pages and outlines are prose. */
  const form = computed(() => store.project?.chapters.find((chapter) => chapter.file === file.value)?.form ?? 'prose')
  /** Counts changes to the text, so what is read from it (an untitled poem's first line) follows typing. */
  const edits = ref(0)
  /** The open text's first line as words, for an untitled poem's name while it is being written. */
  const firstLine = computed(() => {
    void edits.value
    return editor && state.value === 'ready' ? firstLineOf(editor.text()) : null
  })

  const editorSettings = (project: ProjectView | null, preferences: Preferences | null): EditorSettings => ({
    form: form.value,
    projectDirection: project?.direction ?? 'ltr',
    directionMode: 'project',
    language: project?.language ?? preferences?.locale ?? 'en',
    labels: {
      chapterText: options.label?.() ?? settings.t('chapter-text'),
      sceneBreak: settings.t('scene-break'),
      // Inside the page, in the book's language, like the text it stands in for.
      startWriting: settings.tIn(project?.language ?? settings.locale, 'start-writing'),
    },
  })

  function flush(): void {
    clearTimeout(timer)
    if (!pending.value || !file.value || !editor) return
    pending.value = false
    void api.saveChapter({ file: file.value, text: editor.text(), generation })
  }

  /** Where the author was in each chapter, from last time and from this session. */
  const positions = new Map<ProjectPath, ChapterPosition>(
    Object.entries(options.remembersPosition ? (store.opened?.positions ?? {}) : {}) as [ProjectPath, ChapterPosition][],
  )
  /**
   * The paragraph at the top of the page as last known, for while the editor is hidden (Write hides
   * while Story shows) and can't be measured: set on opening a chapter and on hiding.
   */
  let lastTop: number | undefined

  /** Where the author left off in Write. Pages edited in Story don't count: Write reopens on a chapter. */
  function rememberPosition(): void {
    if (!options.remembersPosition || !file.value || !editor || state.value !== 'ready') return
    const top = editor.top() ?? lastTop
    const position = { cursor: editor.cursor(), ...(top === undefined ? {} : { top }) }
    positions.set(file.value, position)
    void api.leftOff({ file: file.value, ...position })
  }

  /** Opens a chapter where the author was in it, unless `position` says otherwise. */
  async function open(next: ProjectPath, position?: ChapterPosition): Promise<void> {
    if (next === file.value && state.value === 'ready') return editor?.focus()
    flush()
    rememberPosition()
    const { cursor, top } = position ?? positions.get(next) ?? { cursor: 0 }
    if (next !== file.value) setMode(defaultMode())
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
    lastTop = top ?? 0
    // The new chapter's form first, so its text loads with the right keys (ADR 0013).
    editor?.updateSettings(editorSettings(store.project, settings.preferences))
    editor?.load(chapter.value.text, cursor, top)
    state.value = 'ready'
    edits.value++
    editor?.focus()
  }

  function onHostEvent(event: HostEvent): void {
    if (event.kind === 'chapter-reloaded' && event.file === file.value && editor) {
      // Text typed here but not yet sent belongs to the old version: send it, and the host holds it as a conflict.
      if (pending.value) flush()
      else {
        generation = event.generation
        editor.load(event.text, editor.cursor(), editor.top() ?? lastTop)
        edits.value++
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
    // A chapter's copy is put on the side of the book; a page's or an outline's sits beside it in its folder.
    const chapter = copy ? project.chapters.find((each) => each.file === copy) : undefined
    if (copy) store.tell(chapter ? 'conflict-kept' : 'conflict-kept-beside', chapter?.title ?? copy.split('/').at(-1) ?? copy)
    if (text === null) state.value = 'missing'
    else if (result.value.generation !== generation) editor?.load(text, editor.cursor(), editor.top() ?? lastTop)
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
        edits.value++
        pending.value = true
        clearTimeout(timer)
        timer = setTimeout(flush, AUTOSAVE_DELAY_MS)
      },
      convertPaste: pastedMarkdown,
      onSelection: (place) => {
        selection.value = place
      },
      onLink: (place) => {
        link.value = place
      },
      mode: mode.value,
      ...(options.foldedSection ? { foldedSection: options.foldedSection } : {}),
      ...(options.outline ? { outline: options.outline } : {}),
      ...(options.links ? { links: options.links } : {}),
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
    () => [store.project?.direction, store.project?.language, settings.locale, form.value] as const,
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
    mode,
    setMode,
    link,
    changeLink: (target: string) => editor?.changeLink(target),
    removeLink: () => editor?.removeLink(),
    pickLink: (markdown: string) => editor?.pickLink(markdown),
    /** The text in the editor now, saved or not. */
    text: () => editor?.text() ?? '',
    cursor: () => editor?.cursor() ?? 0,
    select: (from: number, to?: number) => editor?.select(from, to),
    setParagraphDirection: (direction: 'ltr' | 'rtl' | null) => editor?.setParagraphDirection(direction),
    setPhraseDirection: (direction: 'ltr' | 'rtl' | null) => editor?.setPhraseDirection(direction),
    selection,
    /** Measures the selection again, after the page around the editor scrolled. */
    refreshSelection: () => {
      selection.value = editor?.selectionPlace() ?? null
    },
    focus: () => editor?.focus(),
    form,
    firstLine,
    /** The Hebrew letter before the cursor and its niqqud, for the picker (ADR 0013). */
    niqqud: (): NiqqudReport | null => editor?.niqqud() ?? null,
    toggleNiqqud: (mark: string) => editor?.toggleNiqqud(mark),
    moveToLetter: (forward: boolean) => editor?.moveToLetter(forward),
    /** The view is about to be hidden: note the paragraph at the top of the page while it can be measured. */
    hiding: () => {
      lastTop = editor?.top() ?? lastTop
    },
  }
}
