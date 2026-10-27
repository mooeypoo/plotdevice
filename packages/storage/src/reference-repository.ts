import type { CardLinks, FileLinks, ProjectFolders, ReferenceRepository } from '@plotdevice/application'
import {
  cleanTags,
  kindOfFile,
  OUTLINES_FOLDER,
  REFERENCE_FOLDERS,
  referenceFileFor,
  relationshipHeadingFor,
  resolveWikiLink,
  type ReferenceSummary,
} from '@plotdevice/domain'
import {
  editRelationships,
  findLinks,
  newReferencePage,
  readOutline,
  readReferencePage,
  readRelationships,
  setFrontmatterList,
  setFrontmatterValues,
  type FoundLink,
  type OutlineItemSource,
} from '@plotdevice/markdown'
import { dirnameOf, err, ok, RELATIONSHIP_HEADINGS, stemOf, type ProjectPath } from '@plotdevice/shared'

const REFERENCE_PREFIXES = Object.values(REFERENCE_FOLDERS).map((folder) => `${folder}/`)
const HEADINGS = Object.values(RELATIONSHIP_HEADINGS)

/** The project file a link points at, if it exists; `[[name]]` only when exactly one file has that name. */
function resolve(link: FoundLink, files: readonly ProjectPath[]): ProjectPath | null {
  return link.kind === 'path' ? (files.find((file) => file === link.target) ?? null) : resolveWikiLink(link.name, files)
}

const resolveAll = (links: readonly FoundLink[], files: readonly ProjectPath[]): ProjectPath[] => [
  ...new Set(links.flatMap((link) => resolve(link, files) ?? [])),
]

/** A page as lists show it, with its relationships and every file it links to. */
function summarize(file: ProjectPath, text: string, files: readonly ProjectPath[]): ReferenceSummary {
  const page = readReferencePage(text, stemOf(file))
  const dir = dirnameOf(file)
  return {
    file,
    kind: kindOfFile(file) ?? 'note',
    title: page.title,
    aka: page.aka,
    tags: cleanTags(page.tags),
    description: page.description,
    invalidDetails: page.invalidDetails,
    relationships: readRelationships(text, dir, HEADINGS).relationships.map((relationship) => ({
      text: relationship.text,
      links: resolveAll(relationship.links, files),
    })),
    links: resolveAll(findLinks(text, dir), files),
  }
}

/**
 * Characters, places and notes as Markdown pages, read leniently (Milestone 5), and the links outline
 * cards make. Only the app's own changes write: creating a page, or setting its title, tags or relationships.
 */
export function createReferenceRepository({ folders }: { folders: ProjectFolders }): ReferenceRepository {
  return {
    async listReferences(root) {
      const store = folders.open(root)
      const all = await store.listMarkdownFiles()
      const files = all.filter((file) => REFERENCE_PREFIXES.some((prefix) => file.startsWith(prefix))).sort()
      return Promise.all(
        files.map(async (file): Promise<ReferenceSummary> => {
          const read = await store.read(file)
          // An unreadable page is still listed, under its file name, so nothing silently disappears.
          return read.ok ? summarize(file, read.value.text, all) : summarize(file, '', all)
        }),
      )
    },

    async readReference(root, file) {
      const store = folders.open(root)
      const read = await store.read(file)
      if (!read.ok) return err(read.error === 'missing' ? 'missing' : 'unreadable')
      const page = readReferencePage(read.value.text, stemOf(file))
      return ok({
        ...summarize(file, read.value.text, await store.listMarkdownFiles()),
        details: page.details,
      })
    },

    async createReference(root, kind, title) {
      const name = title.trim()
      if (name === '') return err('empty-text')
      if (/[\r\n]/.test(name)) return err('multiline-text')
      const store = folders.open(root)
      const content = { text: newReferencePage(name), hasBom: false }
      // A name taken between listing and writing is refused (`expected: null`), so look again.
      for (let attempt = 0; attempt < 3; attempt++) {
        const file = referenceFileFor(kind, name, await store.listMarkdownFiles())
        const written = await store.write(file, content, null)
        if (written.ok)
          return ok({ file, kind, title: name, aka: [], tags: [], description: null, invalidDetails: false, relationships: [], links: [] })
        if (written.error.code !== 'stale') break
      }
      return err('write-failed')
    },

    async renameReference(root, file, title) {
      const name = title.trim()
      if (name === '') return err('empty-text')
      if (/[\r\n]/.test(name)) return err('multiline-text')
      const store = folders.open(root)
      const current = await store.read(file)
      if (!current.ok) return err(current.error === 'missing' ? 'missing' : 'unreadable')
      const updated = setFrontmatterValues(current.value.text, { title: name })
      if (!updated.ok) return err('unreadable')
      const written = await store.write(file, { text: updated.value, hasBom: current.value.hasBom }, current.value.revision)
      if (!written.ok) return err(written.error.code === 'stale' ? 'stale' : 'write-failed')
      return ok(undefined)
    },

    async setTags(root, file, tags) {
      const store = folders.open(root)
      const current = await store.read(file)
      if (!current.ok) return err(current.error === 'missing' ? 'missing' : 'unreadable')
      const updated = setFrontmatterList(current.value.text, 'tags', cleanTags(tags))
      if (!updated.ok) return err('unreadable')
      if (updated.value === current.value.text) return ok(undefined)
      const written = await store.write(file, { text: updated.value, hasBom: current.value.hasBom }, current.value.revision)
      if (!written.ok) return err(written.error.code === 'stale' ? 'stale' : 'write-failed')
      return ok(undefined)
    },

    async editRelationship(root, file, edit, language) {
      const store = folders.open(root)
      const current = await store.read(file)
      if (!current.ok) return err(current.error === 'missing' ? 'missing' : 'unreadable')
      const change = edit.kind === 'add' ? { ...edit, heading: relationshipHeadingFor(language) } : edit
      const updated = editRelationships(current.value.text, dirnameOf(file), HEADINGS, change)
      if (!updated.ok) return updated
      const written = await store.write(file, { text: updated.value, hasBom: current.value.hasBom }, current.value.revision)
      if (!written.ok) return err(written.error.code === 'stale' ? 'stale' : 'write-failed')
      return ok(undefined)
    },

    async fileLinks(root, files) {
      const store = folders.open(root)
      const all = await store.listMarkdownFiles()
      const result: FileLinks[] = []
      for (const file of files) {
        const read = await store.read(file)
        if (!read.ok) continue
        const links = resolveAll(findLinks(read.value.text, dirnameOf(file)), all)
        if (links.length > 0) result.push({ file, links })
      }
      return result
    },

    async cardLinks(root) {
      const store = folders.open(root)
      const files = await store.listMarkdownFiles()
      const outlines = files.filter((file) => file.startsWith(`${OUTLINES_FOLDER}/`)).sort()
      const result: CardLinks[] = []
      for (const outlineFile of outlines) {
        const read = await store.read(outlineFile)
        if (!read.ok) continue
        const outline = readOutline(read.value.text)
        const textOf = (item: OutlineItemSource): string => [item.text, ...item.children.map(textOf)].join('\n')
        for (const section of outline.sections) {
          for (const card of section.items) {
            const links = findLinks(textOf(card), dirnameOf(outlineFile)).flatMap((link) => resolve(link, files) ?? [])
            if (links.length > 0)
              result.push({
                outline: outlineFile,
                outlineTitle: outline.title?.text ?? null,
                section: section.heading?.text ?? null,
                card: card.text,
                links,
              })
          }
        }
      }
      return result
    },
  }
}
