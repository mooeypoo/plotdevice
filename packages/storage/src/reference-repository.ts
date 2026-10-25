import type { CardLinks, ProjectFolders, ReferenceRepository } from '@plotdevice/application'
import { kindOfFile, OUTLINES_FOLDER, REFERENCE_FOLDERS, referenceFileFor, resolveWikiLink, type ReferenceSummary } from '@plotdevice/domain'
import { findLinks, newReferencePage, readOutline, readReferencePage, setFrontmatterValues, type OutlineItemSource } from '@plotdevice/markdown'
import { dirnameOf, err, ok, stemOf, type ProjectPath } from '@plotdevice/shared'

const REFERENCE_PREFIXES = Object.values(REFERENCE_FOLDERS).map((folder) => `${folder}/`)

/**
 * Characters, places and notes as Markdown pages, read leniently (Milestone 5), and the links outline
 * cards make. Only the app's own changes write: creating a page, or setting its title.
 */
export function createReferenceRepository({ folders }: { folders: ProjectFolders }): ReferenceRepository {
  return {
    async listReferences(root) {
      const store = folders.open(root)
      const files = (await store.listMarkdownFiles()).filter((file) => REFERENCE_PREFIXES.some((prefix) => file.startsWith(prefix))).sort()
      return Promise.all(
        files.map(async (file): Promise<ReferenceSummary> => {
          const read = await store.read(file)
          // An unreadable page is still listed, under its file name, so nothing silently disappears.
          const page = read.ok ? readReferencePage(read.value.text, stemOf(file)) : { title: stemOf(file), aka: [], description: null }
          return { file, kind: kindOfFile(file) ?? 'note', title: page.title, aka: page.aka, description: page.description }
        }),
      )
    },

    async readReference(root, file) {
      const read = await folders.open(root).read(file)
      if (!read.ok) return err(read.error === 'missing' ? 'missing' : 'unreadable')
      const page = readReferencePage(read.value.text, stemOf(file))
      return ok({ file, kind: kindOfFile(file) ?? 'note', ...page })
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
        if (written.ok) return ok({ file, kind, title: name, aka: [], description: null })
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
            const links = findLinks(textOf(card), dirnameOf(outlineFile)).flatMap((link): ProjectPath[] => {
              const target = link.kind === 'path' ? (files.find((file) => file === link.target) ?? null) : resolveWikiLink(link.name, files)
              return target ? [target] : []
            })
            if (links.length > 0) result.push({ outline: outlineFile, outlineTitle: outline.title?.text ?? null, section: section.heading?.text ?? null, card: card.text, links })
          }
        }
      }
      return result
    },
  }
}
