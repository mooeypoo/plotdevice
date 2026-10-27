import {
  cardsLinkingTo,
  linkedFrom,
  type ProjectSnapshot,
  type RecentProjectsSession,
  type ReferenceRepository,
  type WritingSession,
} from '@plotdevice/application'
import {
  chapterLinksSchema,
  channels,
  createReferenceSchema,
  editRelationshipSchema,
  referenceFileSchema,
  renameReferenceFileSchema,
  renameReferenceSchema,
  setTagsSchema,
  shelfSchema,
  type CardLinksView,
  type LinkedFromView,
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
  /** Names a linked file for display: a page by its title, a chapter by its name, anything else by its file name. */
  const namer = async (project: ProjectSnapshot) => {
    const pages = new Map((await references.listReferences(project.root)).map((page) => [page.file, page]))
    const chapters = new Map(project.chapters.map((chapter) => [chapter.file, chapter.title]))
    return (link: ProjectPath): LinkTargetView => {
      const page = pages.get(link)
      if (page) return { file: link, kind: page.kind, title: page.title }
      if (chapters.has(link)) return { file: link, kind: 'chapter', title: chapters.get(link) ?? stemOf(link) }
      return { file: link, kind: link.startsWith('outlines/') ? 'outline' : (kindOfFile(link) ?? 'other'), title: stemOf(link) }
    }
  }
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

    [channels.renameReferenceFile]: async (payload): Promise<ReferenceResult<ReferenceSummaryView>> => {
      const { file, newName } = parsePayload(renameReferenceFileSchema, payload)
      const projectRoot = root()
      if (!projectRoot) return err('no-project')
      // Through the session: an open page follows its file, and links in open files reload.
      const renamed = await writing.renameFile(file, newName)
      if (!renamed.ok)
        return err(
          renamed.error === 'invalid-name' || renamed.error === 'name-taken' || renamed.error === 'no-project'
            ? renamed.error
            : 'write-failed',
        )
      const summary = await summaryOf(projectRoot, renamed.value.file)
      return summary ? ok(summary) : err('missing')
    },

    [channels.cardsAbout]: async (payload): Promise<CardLinksView[]> => {
      const { file } = parsePayload(chapterLinksSchema, payload)
      const project = writing.project()
      if (!project) return []
      const target = await namer(project)
      return cardsLinkingTo(await references.cardLinks(project.root), file).map((card) => ({ ...card, links: card.links.map(target) }))
    },

    [channels.editRelationship]: async (payload): Promise<ReferenceResult<ReferencePageView>> => {
      const { file, change } = parsePayload(editRelationshipSchema, payload)
      const project = writing.project()
      if (!project) return err('no-project')
      // The page may be open: its editor shows the new text, and saving carries on from it.
      const edited = await writing.updateFile(
        file,
        () => references.editRelationship(project.root, file, change, project.details.language),
        {
          reload: true,
        },
      )
      if (!edited.ok) return edited
      return references.readReference(project.root, file)
    },

    [channels.setTags]: async (payload): Promise<ReferenceResult<ReferenceSummaryView>> => {
      const { file, tags } = parsePayload(setTagsSchema, payload)
      const projectRoot = root()
      if (!projectRoot) return err('no-project')
      // Between saves, if the page is open: the tags are in its frontmatter.
      const set = await writing.updateFile(file, () => references.setTags(projectRoot, file, tags))
      if (!set.ok) return set
      const summary = await summaryOf(projectRoot, file)
      return summary ? ok(summary) : err('missing')
    },

    [channels.linkedFrom]: async (payload): Promise<LinkedFromView> => {
      const { file } = parsePayload(referenceFileSchema, payload)
      const project = writing.project()
      if (!project) return { cards: [], pages: [], chapters: [] }
      const [cards, pages, chapters, target] = await Promise.all([
        references.cardLinks(project.root),
        references.listReferences(project.root),
        references.fileLinks(
          project.root,
          project.chapters.map((chapter) => chapter.file),
        ),
        namer(project),
      ])
      const found = linkedFrom(file, { cards, pages, chapters })
      return {
        cards: found.cards.map((card) => ({ ...card, links: card.links.map(target) })),
        pages: found.pages,
        chapters: found.chapters.map((chapter) => ({ file: chapter, title: target(chapter).title })),
      }
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
