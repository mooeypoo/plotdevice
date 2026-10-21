import type { EditorState } from '@codemirror/state'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { z } from 'zod'
import { placeOf } from './entry-owners'
import { useUiLanguageStore } from './ui-language-store'
import type { MessageKey } from '../../../i18n/translator'

const KEY = 'plotdevice.documentTabs'
const documentSchema = z.object({
  path: z.string(),
  pinned: z.boolean(),
  temporary: z.boolean()
})
const projectSchema = z.object({
  documents: z.array(documentSchema),
  activePath: z.string().nullable(),
  writingPath: z.string().nullable()
})
const settingsSchema = z.object({
  version: z.literal(1),
  projects: z.record(z.string(), projectSchema)
})
type SavedProject = z.infer<typeof projectSchema>
type Settings = z.infer<typeof settingsSchema>
type TabNotice = Extract<MessageKey, `tabs-notice-${string}`>

/** Navigation metadata for a document, with a stable session identity across app renames. */
export interface DocumentTab extends z.infer<typeof documentSchema> {
  readonly id: string
}

/** Session-only CodeMirror state and reading position, never serialized to user settings. */
export interface DocumentView {
  readonly state: EditorState
  readonly scrollTop: number
  readonly scrollLeft: number
}

/** Temporary, kept and pinned documents, including the manuscript's protected writing target. */
export const useDocumentTabsStore = defineStore('document-tabs', () => {
  const documents = ref<readonly DocumentTab[]>([])
  const activePath = ref<string | null>(null)
  const writingPath = ref<string | null>(null)
  const language = useUiLanguageStore()
  const storageNoticeKey = ref<TabNotice | null>(null)
  const storageNotice = computed(() =>
    storageNoticeKey.value === null ? '' : language.t(storageNoticeKey.value)
  )
  const views = new Map<string, DocumentView>()
  let root: string | null = null
  let sequence = 0
  const writing = computed(() => documents.value.find((tab) => tab.path === writingPath.value))
  const ordered = computed(() =>
    writing.value === undefined
      ? documents.value
      : [writing.value, ...documents.value.filter((tab) => tab.path !== writingPath.value)]
  )
  const manuscript = (path: string): boolean => {
    const kind = placeOf(path)?.kind
    return kind === 'chapter' || kind === 'part'
  }

  function report(notice: TabNotice, error: unknown): void {
    storageNoticeKey.value = notice
    console.warn('Document tab settings failure.', notice, error)
  }

  function readSettings(): Settings {
    let raw: string | null
    try {
      raw = localStorage.getItem(KEY)
    } catch (error) {
      report('tabs-notice-load-failed', error)
      return { version: 1, projects: {} }
    }
    if (raw === null) return { version: 1, projects: {} }
    let value: unknown
    try {
      value = JSON.parse(raw) as unknown
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error
      report('tabs-notice-invalid', error)
      return { version: 1, projects: {} }
    }
    const parsed = settingsSchema.safeParse(value)
    if (parsed.success) return parsed.data
    report('tabs-notice-invalid', parsed.error)
    return { version: 1, projects: {} }
  }

  function persist(): void {
    if (root === null) return
    const settings = readSettings()
    const project: SavedProject = {
      documents: documents.value.map(({ path, pinned, temporary }) => ({
        path,
        pinned,
        temporary
      })),
      activePath: activePath.value,
      writingPath: writingPath.value
    }
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({
          ...settings,
          projects: { ...settings.projects, [root]: project }
        })
      )
    } catch (error) {
      report('tabs-notice-save-failed', error)
    }
  }

  function clear(): void {
    root = null
    documents.value = []
    activePath.value = null
    writingPath.value = null
    storageNoticeKey.value = null
    views.clear()
  }

  function restore(projectRoot: string): void {
    clear()
    root = projectRoot
    const saved = readSettings().projects[projectRoot]
    if (saved === undefined) return
    const seen = new Set<string>()
    let temporary = false
    documents.value = saved.documents.flatMap((tab) => {
      if (seen.has(tab.path) || placeOf(tab.path) === undefined) return []
      seen.add(tab.path)
      const preview = tab.temporary && !tab.pinned && !temporary
      temporary ||= preview
      return [{ ...tab, temporary: preview, id: `document-${String(++sequence)}` }]
    })
    writingPath.value =
      saved.writingPath !== null && seen.has(saved.writingPath) && manuscript(saved.writingPath)
        ? saved.writingPath
        : (documents.value.find((tab) => manuscript(tab.path))?.path ?? null)
    if (writingPath.value !== null) keep(writingPath.value, false)
    activePath.value =
      saved.activePath !== null && seen.has(saved.activePath)
        ? saved.activePath
        : (writingPath.value ?? documents.value[0]?.path ?? null)
    persist()
  }

  function keep(path: string, save = true): void {
    documents.value = documents.value.map((tab) =>
      tab.path === path ? { ...tab, temporary: false } : tab
    )
    if (save) persist()
  }

  function remove(path: string): void {
    const tab = documents.value.find((candidate) => candidate.path === path)
    if (tab !== undefined) views.delete(tab.id)
    documents.value = documents.value.filter((candidate) => candidate.path !== path)
    if (activePath.value === path) activePath.value = null
    if (writingPath.value === path) {
      writingPath.value =
        documents.value.find((candidate) => manuscript(candidate.path))?.path ?? null
      if (writingPath.value !== null) keep(writingPath.value, false)
    }
    persist()
  }

  function opened(path: string, kept = false): void {
    if (placeOf(path) === undefined) return
    if (!documents.value.some((tab) => tab.path === path)) {
      const isWriting = writingPath.value === null && manuscript(path)
      const temporary = !kept && !isWriting
      if (temporary) {
        const previous = documents.value.find((tab) => tab.temporary)
        if (previous !== undefined) remove(previous.path)
      }
      documents.value = [
        ...documents.value,
        {
          path,
          id: `document-${String(++sequence)}`,
          pinned: false,
          temporary
        }
      ]
      if (isWriting) writingPath.value = path
    }
    if (kept) keep(path, false)
    activePath.value = path
    persist()
  }

  function edited(path: string): void {
    const tab = documents.value.find((candidate) => candidate.path === path)
    const changesWriting = manuscript(path) && !writing.value?.pinned && writingPath.value !== path
    if (tab === undefined || (!tab.temporary && !changesWriting)) return
    keep(path, false)
    if (changesWriting) writingPath.value = path
    persist()
  }

  function togglePin(path: string): void {
    documents.value = documents.value.map((tab) =>
      tab.path === path ? { ...tab, pinned: !tab.pinned, temporary: false } : tab
    )
    persist()
  }

  function writeHere(path: string, pinned = true): void {
    if (!manuscript(path) || !documents.value.some((tab) => tab.path === path)) return
    writingPath.value = path
    documents.value = documents.value.map((tab) =>
      tab.path === path ? { ...tab, pinned, temporary: false } : tab
    )
    persist()
  }

  function followMove(from: string, to: string): void {
    const moved = documents.value.find((tab) => tab.path === from)
    if (moved === undefined || from === to) return
    const duplicate = documents.value.find((tab) => tab.path === to)
    if (duplicate !== undefined) views.delete(duplicate.id)
    documents.value = documents.value
      .filter((tab) => tab.path !== to)
      .map((tab) => (tab.path === from ? { ...tab, path: to } : tab))
    if (writingPath.value === from) writingPath.value = to
    if (activePath.value === from) activePath.value = to
    persist()
  }

  function refresh(active: string | null): void {
    const missing = documents.value.filter(
      (tab) => tab.path !== active && placeOf(tab.path) === undefined
    )
    for (const tab of missing) remove(tab.path)
    const target = writingPath.value
    if (target !== null && placeOf(target) !== undefined && !manuscript(target)) {
      writingPath.value = documents.value.find((tab) => manuscript(tab.path))?.path ?? null
      if (writingPath.value !== null) keep(writingPath.value, false)
      persist()
    }
    if (missing.length > 0) {
      storageNoticeKey.value = 'tabs-notice-pruned'
    }
  }

  function rememberView(id: string, view: DocumentView): void {
    if (documents.value.some((tab) => tab.id === id)) views.set(id, view)
  }

  return {
    documents,
    ordered,
    activePath,
    writingPath,
    writing,
    storageNotice,
    restore,
    clear,
    opened,
    edited,
    keep,
    togglePin,
    writeHere,
    remove,
    followMove,
    refresh,
    canClose: (path: string) =>
      path !== writingPath.value && documents.value.some((tab) => tab.path === path && !tab.pinned),
    documentId: (path: string) => documents.value.find((tab) => tab.path === path)?.id,
    rememberView,
    viewOf: (id: string) => views.get(id)
  }
})
