import type { ImportPlanRequest, ImportPlanView, ImportStartView, SplitByView } from '@plotdevice/contracts'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useApi } from '../api'
import { useProjectStore } from './project'
import { useViewStore } from './view'

type Edits = ImportPlanRequest['edits']
const noEdits = (): Edits => ({ starts: [], joins: [], names: {}, leftOut: [] })

/**
 * Bringing in a Word file (Milestone 23): the preview of how it splits into chapters, the author's
 * changes to it, and finishing as a new book (through New project) or as chapters added to this one.
 */
export const useImportStore = defineStore('import', () => {
  const api = useApi()
  const project = useProjectStore()
  const view = useViewStore()
  const purpose = ref<'new' | 'add' | null>(null)
  const started = ref<ImportStartView | null>(null)
  const plan = ref<ImportPlanView | null>(null)
  const edits = ref<Edits>(noEdits())
  const busy = ref(false)
  /** Chosen for a new book: New project shows its details, then makes the book from these chapters. */
  const forNewBook = ref<{
    fileName: string
    title: string
    author: string
    language: 'he' | 'en'
    plan: ImportPlanRequest
    chapters: number
  } | null>(null)

  const open = computed(() => started.value !== null)
  const kept = computed(() => (plan.value?.chapters ?? []).filter((chapter) => chapter.included))
  const request = (): ImportPlanRequest => ({
    split: plan.value?.split ?? 'headings',
    edits: JSON.parse(JSON.stringify(edits.value)) as Edits,
  })

  async function start(kind: 'new' | 'add'): Promise<void> {
    const result = await api.startImport(kind)
    if (!result.ok) {
      // Shown over the book, or on the start screen when there's none.
      if (result.error !== 'cancelled') project.tell(`import-failed-${result.error}`)
      return
    }
    purpose.value = kind
    started.value = result.value
    plan.value = result.value.plan
    edits.value = noEdits()
  }

  async function replan(): Promise<void> {
    const result = await api.planImport(request())
    if (result.ok) plan.value = result.value
  }

  async function splitBy(split: SplitByView): Promise<void> {
    if (!plan.value) return
    plan.value = { ...plan.value, split }
    edits.value = noEdits() // changes belong to one way of splitting
    await replan()
  }
  const startHere = (paragraph: number) =>
    change({ starts: [...edits.value.starts, paragraph], joins: edits.value.joins.filter((j) => j !== paragraph) })
  const joinUp = (start: number) => change({ joins: [...edits.value.joins, start], starts: edits.value.starts.filter((s) => s !== start) })
  const rename = (start: number, name: string) => change({ names: { ...edits.value.names, [String(start)]: name } })
  const include = (start: number, on: boolean) =>
    change({ leftOut: on ? edits.value.leftOut.filter((s) => s !== start) : [...edits.value.leftOut, start] })
  async function change(next: Partial<Edits>): Promise<void> {
    edits.value = { ...edits.value, ...next }
    await replan()
  }

  function close(): void {
    started.value = null
    plan.value = null
    purpose.value = null
    void api.cancelImport()
  }

  /** New book: on to New project's details, filled in from the Word file. The import stays open in the host. */
  function toNewBook(): void {
    const from = started.value
    if (!from || kept.value.length === 0) return
    forNewBook.value = {
      fileName: from.fileName,
      title: from.title ?? '',
      author: from.author ?? '',
      language: from.language,
      plan: request(),
      chapters: kept.value.length,
    }
    started.value = null
    plan.value = null
    purpose.value = null
    view.newProject = true
  }

  function forgetNewBook(): void {
    if (forNewBook.value) void api.cancelImport()
    forNewBook.value = null
  }

  /** This book: the chapters at the end, in a new part named `partName` unless the file has its own parts. */
  async function addToBook(partName: string): Promise<void> {
    if (busy.value || kept.value.length === 0) return
    busy.value = true
    try {
      const result = await api.addImported(request(), partName)
      if (!result.ok) {
        // Here "unreadable" is the book's own contents, not the Word file.
        project.tell(result.error === 'unreadable' ? 'import-failed-unreadable-book' : `import-failed-${result.error}`)
        return
      }
      project.setProject(result.value.project)
      started.value = null
      plan.value = null
      purpose.value = null
      const { added, fileDetails } = result.value
      if (fileDetails)
        project.offer('imported-chapters-details', [String(added), fileDetails.title ?? '', fileDetails.author ?? ''], {
          key: 'imported-use-details',
          run: () => void useFileDetails(),
        })
      else project.tell('imported-chapters', String(added))
    } finally {
      busy.value = false
    }
  }

  async function useFileDetails(): Promise<void> {
    const result = await api.useImportedDetails()
    if (result.ok) project.setProject(result.value)
  }

  return {
    purpose,
    started,
    plan,
    edits,
    busy,
    forNewBook,
    open,
    kept,
    start,
    splitBy,
    startHere,
    joinUp,
    rename,
    include,
    close,
    toNewBook,
    forgetNewBook,
    addToBook,
  }
})
