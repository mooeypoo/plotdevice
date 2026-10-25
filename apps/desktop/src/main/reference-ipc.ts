import { cardsLinkingTo, type RecentProjectsSession, type ReferenceRepository, type WritingSession } from '@plotdevice/application'
import {
  chapterLinksSchema,
  channels,
  createReferenceSchema,
  referenceFileSchema,
  renameReferenceSchema,
  shelfSchema,
  type CardLinksView,
  type LinkTargetView,
  type ReferencePageView,
  type ReferenceResult,
  type ReferenceSummaryView,
} from '@plotdevice/contracts'
import { kindOfFile } from '@plotdevice/domain'
import { err, ok, stemOf, type ProjectPath } from '@plotdevice/shared'
import { parsePayload } from './payload'
import type { PayloadHandler } from './project-ipc'

export interface ReferenceIpcContext {
  references: ReferenceRepository
  writing: WritingSession
  recent: RecentProjectsSession
}

/** Character, place and note calls; the pinned shelf. Paths outside the page folders are refused by the schemas. */
export function createReferenceHandlers({ references, writing, recent }: ReferenceIpcContext): Record<string, PayloadHandler> {
  const root = (): string | null => writing.project()?.root ?? null
  const summaryOf = async (projectRoot: string, file: ProjectPath): Promise<ReferenceSummaryView | null> =>
    (await references.listReferences(projectRoot)).find((reference) => reference.file === file) ?? null

  return {
    [channels.listReferences]: async () => {
      const projectRoot = root()
      return projectRoot ? references.listReferences(projectRoot) : []
    },

    [channels.readReference]: async (payload): Promise<ReferenceResult<ReferencePageView>> => {
      const { file } = parsePayload(referenceFileSchema, payload)
      const projectRoot = root()
      return projectRoot ? references.readReference(projectRoot, file) : err('no-project')
    },

    [channels.createReference]: async (payload): Promise<ReferenceResult<ReferenceSummaryView>> => {
      const { kind, title } = parsePayload(createReferenceSchema, payload)
      const projectRoot = root()
      return projectRoot ? references.createReference(projectRoot, kind, title) : err('no-project')
    },

    [channels.renameReference]: async (payload): Promise<ReferenceResult<ReferenceSummaryView>> => {
      const { file, title } = parsePayload(renameReferenceSchema, payload)
      const projectRoot = root()
      if (!projectRoot) return err('no-project')
      // Between saves, if the page is open: the title is in its frontmatter.
      const renamed = await writing.updateFile(file, () => references.renameReference(projectRoot, file, title))
      if (!renamed.ok) return renamed
      const summary = await summaryOf(projectRoot, file)
      return summary ? ok(summary) : err('missing')
    },

    [channels.cardsAbout]: async (payload): Promise<CardLinksView[]> => {
      const { file } = parsePayload(chapterLinksSchema, payload)
      const project = writing.project()
      if (!project) return []
      const pages = new Map((await references.listReferences(project.root)).map((page) => [page.file, page]))
      const chapters = new Map(project.chapters.map((chapter) => [chapter.file, chapter.title]))
      const target = (link: ProjectPath): LinkTargetView => {
        const page = pages.get(link)
        if (page) return { file: link, kind: page.kind, title: page.title }
        if (chapters.has(link)) return { file: link, kind: 'chapter', title: chapters.get(link) ?? stemOf(link) }
        return { file: link, kind: link.startsWith('outlines/') ? 'outline' : (kindOfFile(link) ?? 'other'), title: stemOf(link) }
      }
      return cardsLinkingTo(await references.cardLinks(project.root), file).map((card) => ({ ...card, links: card.links.map(target) }))
    },

    [channels.getShelf]: async () => {
      const projectRoot = root()
      return (projectRoot && recent.current().projects.find((project) => project.root === projectRoot)?.shelf) ?? []
    },

    [channels.setShelf]: async (payload) => {
      const { files } = parsePayload(shelfSchema, payload)
      const projectRoot = root()
      if (projectRoot) await recent.pin(projectRoot, files)
    },
  }
}
