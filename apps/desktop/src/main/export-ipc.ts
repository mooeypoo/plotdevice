import type { AppDataFile, ProjectFolders, ProjectSnapshot, WritingSession } from '@plotdevice/application'
import {
  channels,
  exportChoicesSchema,
  exportedFileSchema,
  exportRequestSchema,
  type ChooseCoverResult,
  type ExportBookResult,
  type ExportChoicesView,
  type ExportWindowResult,
} from '@plotdevice/contracts'
import {
  chosenChapters,
  defaultExportChoices,
  projectFolderName,
  roundWordCount,
  type DirectionMode,
  type ExportChoices,
} from '@plotdevice/domain'
import { printHtml, writeDocx, writeEpub, type EpubCover, type ManuscriptFont, type PrintFont } from '@plotdevice/export'
import { err, ok, type ProjectPath } from '@plotdevice/shared'
import { compileManuscript, readBookForExport } from '@plotdevice/storage'
import { basename, dirname, extname, join } from 'node:path'
import { IpcRefused, parsePayload } from './payload'
import type { PayloadHandler } from './project-ipc'
import { projectView } from './views'

export type ExportFormat = ExportChoices['format']

/** Words export writes into the file, in the book's language rather than the interface's. */
export interface BookWords {
  chapter(number: number): string
  /** "about 84,000 words" */
  about(count: string): string
  by: string
  contents: string
}

export interface ExportIpcContext {
  writing: WritingSession
  folders: ProjectFolders
  /** Choices remembered for each book, in app data. */
  remembered: AppDataFile
  /** The computer's region (`US`, `IL`), for the paper size. */
  region: string | null
  directionMode(): DirectionMode
  /** The book's words, in `language`. */
  words(language: string): BookWords
  /** The native save dialog for `format`, suggesting `suggested`; `null` when the author cancels. */
  chooseSaveLocation(suggested: string, format: ExportFormat): Promise<string | null>
  /** The native picture picker; `null` when the author cancels. */
  chooseCover(): Promise<string | null>
  readFile(path: string): Promise<Uint8Array | null>
  /** Writes a file outside the book, atomically. */
  writeOutside(path: string, bytes: Uint8Array): Promise<boolean>
  printToPdf(html: string): Promise<Uint8Array>
  printFonts: readonly PrintFont[]
  printFamilies: readonly string[]
  hebrewFont(): Promise<ManuscriptFont | null>
  showFile(path: string): Promise<void>
  now(): Date
}

const EXTENSIONS: Record<ExportFormat, string> = { word: 'docx', pdf: 'pdf', epub: 'epub', markdown: 'md' }
const COVER_TYPES: Record<string, EpubCover['mediaType']> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
}

/**
 * Export (Milestone 22): the Export window's choices, remembered for each book; the title and author
 * typed there, saved to the book; and the file written where the author chooses, never inside the book.
 * The page can name a cover only if the host offered it, and show only a file the host saved.
 */
export function createExportHandlers(context: ExportIpcContext): Record<string, PayloadHandler> {
  const offeredCovers = new Set<string>()
  const savedFiles = new Set<string>()

  const readRemembered = async (): Promise<Record<string, unknown>> => {
    const text = await context.remembered.read().catch(() => null)
    if (text === null) return {}
    try {
      // Each book's choices are checked when read (`choicesFor`); here only the shape of the file.
      const parsed: unknown = JSON.parse(text)
      const books = typeof parsed === 'object' && parsed !== null ? (parsed as { books?: unknown }).books : undefined
      return typeof books === 'object' && books !== null && !Array.isArray(books) ? { ...(books as Record<string, unknown>) } : {}
    } catch {
      return {}
    }
  }

  const choicesFor = async (root: string): Promise<ExportChoicesView> => {
    const parsed = exportChoicesSchema.safeParse((await readRemembered())[root])
    return parsed.success ? parsed.data : { ...defaultExportChoices(context.region), chapters: 'all' }
  }

  const remember = async (root: string, choices: ExportChoicesView): Promise<void> => {
    const books = await readRemembered()
    books[root] = choices
    await context.remembered.write(`${JSON.stringify({ books }, null, 2)}\n`)
  }

  const titlesOf = (project: ProjectSnapshot) => {
    const titles = new Map<ProjectPath, string>()
    for (const entry of project.contents.entries)
      for (const chapter of entry.kind === 'chapter' ? [entry] : entry.chapters) titles.set(chapter.file, chapter.linkText)
    for (const chapter of project.chapters) if (chapter.title) titles.set(chapter.file, chapter.title)
    return titles
  }

  const wordsOf = (project: ProjectSnapshot) => {
    const words = context.words(project.details.language)
    const unit = project.details.manuscriptUnit
    return { ...words, chapter: (number: number) => (unit ? `${unit.one} ${number}` : words.chapter(number)) }
  }

  const formatCount = (count: number, language: string): string => {
    try {
      return new Intl.NumberFormat(language).format(roundWordCount(count))
    } catch {
      return String(roundWordCount(count))
    }
  }

  return {
    [channels.exportWindow]: async (): Promise<ExportWindowResult> => {
      const project = context.writing.project()
      if (!project) return err('no-project')
      const choices = await choicesFor(project.root)
      if (choices.cover !== null) offeredCovers.add(choices.cover)
      const coverMissing = choices.cover !== null && (await context.readFile(choices.cover)) === null
      const { wordCount, missing } = await readBookForExport(context.folders, project, {
        chapters: undefined,
        headings: 'name',
        directionMode: context.directionMode(),
        chapterLabel: String,
        made: context.now().toISOString(),
      })
      const titles = titlesOf(project)
      return ok({
        choices,
        wordCount: formatCount(wordCount, project.details.language),
        numbered: project.details.chapterNumbering !== 'none',
        coverName: choices.cover === null ? null : basename(choices.cover),
        coverMissing,
        unreadable: missing.map((file) => ({ file, title: titles.get(file) ?? file })),
      })
    },

    [channels.chooseExportCover]: async (): Promise<ChooseCoverResult> => {
      if (!context.writing.project()) return err('no-project')
      const chosen = await context.chooseCover()
      if (chosen === null) return err('cancelled')
      offeredCovers.add(chosen)
      return ok({ path: chosen, name: basename(chosen) })
    },

    [channels.exportBook]: async (payload): Promise<ExportBookResult> => {
      const request = parsePayload(exportRequestSchema, payload)
      let project = context.writing.project()
      if (!project) return err('no-project')
      const { choices } = request
      if (choices.cover !== null && !offeredCovers.has(choices.cover)) throw new IpcRefused('not-offered')

      // The title and author typed in the window are the book's own (owner, 2026-11-07).
      const title = request.title.trim()
      const author = request.author.trim()
      const changed = (title !== '' && title !== project.details.title) || (author !== '' && author !== (project.details.author ?? ''))
      let updated = false
      if (changed) {
        const saved = await context.writing.setDetails({ title, author })
        if (!saved.ok) return err('details-failed')
        project = saved.value
        updated = true
      }

      const chapters = chosenChapters(project.contents, choices.chapters)
      if (chapters !== undefined && chapters.size === 0) return err('no-chapters')

      let cover: EpubCover | null = null
      if (choices.format === 'epub' && choices.cover !== null) {
        const mediaType = COVER_TYPES[extname(choices.cover).toLowerCase()]
        const bytes = await context.readFile(choices.cover)
        if (!mediaType || bytes === null) return err('cover-unreadable')
        cover = { bytes, mediaType }
      }

      const suggested = join(dirname(project.root), `${projectFolderName(project.details.title)}.${EXTENSIONS[choices.format]}`)
      const path = await context.chooseSaveLocation(suggested, choices.format)
      if (path === null) return err('cancelled')
      await remember(project.root, choices)

      const words = wordsOf(project)
      const titles = titlesOf(project)
      let bytes: Uint8Array
      let missing: ProjectPath[]
      try {
        if (choices.format === 'markdown') {
          const compiled = await compileManuscript(context.folders, project, {
            chapters,
            headings: choices.headings,
            chapterLabel: words.chapter,
          })
          bytes = new TextEncoder().encode(compiled.text)
          missing = compiled.missing
        } else {
          const read = await readBookForExport(context.folders, project, {
            chapters,
            headings: choices.headings,
            directionMode: context.directionMode(),
            chapterLabel: words.chapter,
            made: context.now().toISOString(),
          })
          missing = read.missing
          const wordCount = choices.wordCount ? words.about(formatCount(read.wordCount, project.details.language)) : null
          const page = { titlePage: choices.titlePage, wordCount, doubleSpaced: choices.doubleSpaced, paper: choices.paper, by: words.by }
          if (choices.format === 'word') bytes = await writeDocx(read.book, { ...page, hebrewFont: await context.hebrewFont() })
          else if (choices.format === 'pdf')
            bytes = await context.printToPdf(printHtml(read.book, { ...page, fonts: context.printFonts, families: context.printFamilies }))
          else bytes = writeEpub(read.book, { contents: words.contents }, cover)
        }
      } catch (error) {
        console.warn('The book could not be exported:', error)
        return err('export-failed')
      }
      if (!(await context.writeOutside(path, bytes))) return err('write-failed')
      savedFiles.add(path)
      return ok({
        path,
        project: updated ? projectView(project) : null,
        missing: missing.map((file) => ({ file, title: titles.get(file) ?? file })),
      })
    },

    [channels.showExportedFile]: async (payload) => {
      const { path } = parsePayload(exportedFileSchema, payload)
      if (!savedFiles.has(path)) throw new IpcRefused('not-saved')
      await context.showFile(path)
    },
  }
}
