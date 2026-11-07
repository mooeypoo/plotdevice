import type { WritingSession } from '@plotdevice/application'
import {
  addImportedSchema,
  channels,
  importPlanSchema,
  importStartSchema,
  type AddImportedResult,
  type ImportPlanResult,
  type ImportPlanView,
  type ImportStartResult,
  type ProjectChangeResult,
} from '@plotdevice/contracts'
import { chooseSplit, splitManuscript, type ImportPlan } from '@plotdevice/domain'
import { readDocx, type ImportedManuscript } from '@plotdevice/import'
import { err, ok } from '@plotdevice/shared'
import { basename } from 'node:path'
import { chaptersFromImport, editsOf, type ImportState } from './import-state'
import { IpcRefused, parsePayload } from './payload'
import type { PayloadHandler } from './project-ipc'
import { projectView } from './views'

export interface ImportIpcContext {
  writing: WritingSession
  state: ImportState
  /** The native file picker for `.docx` files; `null` when the author cancels. */
  chooseWordFile(): Promise<string | null>
  /** The file's bytes, `'too-big'` over the limit, or `null` when it can't be read. */
  readWordFile(path: string): Promise<Uint8Array | 'too-big' | null>
}

const planView = (plan: ImportPlan): ImportPlanView => ({
  split: plan.split,
  chapters: plan.chapters.map(({ start, part, name, words, included, body }) => ({ start, part, name, words, included, body })),
})

/** Hebrew when most of the text's letters are Hebrew. */
function guessLanguage(manuscript: ImportedManuscript): 'he' | 'en' {
  let hebrew = 0
  let other = 0
  for (const { text } of manuscript.paragraphs) {
    hebrew += (text.match(/[֐-׿]/g) ?? []).length
    other += (text.match(/[A-Za-zÀ-ɏ]/g) ?? []).length
  }
  return hebrew > other ? 'he' : 'en'
}

/**
 * Bringing in a Word file (Milestone 23). The page can't name a file: the host picks it, reads it and
 * keeps it until the import is finished or cancelled. Making a new book from it goes through
 * `createProject` (project-ipc), with `fromImport`.
 */
export function createImportHandlers(context: ImportIpcContext): Record<string, PayloadHandler> {
  const { state, writing } = context
  return {
    [channels.startImport]: async (payload): Promise<ImportStartResult> => {
      const { purpose } = parsePayload(importStartSchema, payload)
      if (purpose === 'add' && !writing.project()) return err('no-project')
      const path = await context.chooseWordFile()
      if (path === null) return err('cancelled')
      const bytes = await context.readWordFile(path)
      if (bytes === 'too-big') return err('too-big')
      if (bytes === null) return err('unreadable')
      const read = await readDocx(bytes)
      if (!read.ok) return read
      const manuscript = read.value
      state.current = { fileName: basename(path), manuscript }
      state.offeredDetails = null
      const plan = splitManuscript(manuscript.paragraphs, chooseSplit(manuscript.paragraphs))
      return ok({
        fileName: basename(path),
        paragraphs: manuscript.paragraphs.map((p) => ({ text: p.text, kind: p.kind, title: p.title })),
        plan: planView(plan),
        leftOut: manuscript.leftOut,
        footnotes: Object.keys(manuscript.footnotes).length,
        title: manuscript.details.title ?? plan.title,
        author: manuscript.details.author ?? plan.author,
        language: guessLanguage(manuscript),
      })
    },

    [channels.planImport]: async (payload): Promise<ImportPlanResult> => {
      const request = parsePayload(importPlanSchema, payload)
      if (!state.current) return err('no-import')
      return ok(planView(splitManuscript(state.current.manuscript.paragraphs, request.split, editsOf(request))))
    },

    [channels.addImported]: async (payload): Promise<AddImportedResult> => {
      const { plan, partName } = parsePayload(addImportedSchema, payload)
      const project = writing.project()
      if (!project) return err('no-project')
      const current = state.current
      const chapters = chaptersFromImport(state, plan, project.details.language)
      if (!current || chapters === null) return err('no-import')
      if (chapters.length === 0) return err('no-chapters')
      // Chapters the file doesn't put in a part go into one named after it, at the end of the book.
      const added = await writing.addChapters(chapters.map((chapter) => ({ ...chapter, part: chapter.part ?? partName })))
      if (!added.ok) return err(added.error)
      const split = splitManuscript(current.manuscript.paragraphs, plan.split, editsOf(plan))
      const title = current.manuscript.details.title ?? split.title
      const author = current.manuscript.details.author ?? split.author
      const differs = (title !== null && title !== project.details.title) || (author !== null && author !== (project.details.author ?? ''))
      state.current = null
      state.offeredDetails = differs ? { ...(title ? { title } : {}), ...(author ? { author } : {}) } : null
      return ok({ project: projectView(added.value), added: chapters.length, fileDetails: differs ? { title, author } : null })
    },

    [channels.useImportedDetails]: async (): Promise<ProjectChangeResult> => {
      const offered = state.offeredDetails
      if (!offered) throw new IpcRefused('not-offered')
      state.offeredDetails = null
      const saved = await writing.setDetails(offered)
      return saved.ok ? ok(projectView(saved.value)) : err(saved.error)
    },

    [channels.cancelImport]: async () => {
      state.current = null
    },
  }
}
