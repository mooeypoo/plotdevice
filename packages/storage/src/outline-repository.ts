import type { OutlineDocument, OutlineRepository, ProjectFolders, Revision } from '@plotdevice/application'
import { OUTLINES_FOLDER, outlineFileFor, type Outline, type OutlineItem, type OutlineNote } from '@plotdevice/domain'
import { editOutline, newOutlineFile, readOutline, type OutlineItemSource, type ParsedOutline } from '@plotdevice/markdown'
import { err, ok, type ProjectPath } from '@plotdevice/shared'

/**
 * Outlines in `outlines/` (ADR 0003): read for structure, edited by splices so untouched text keeps
 * its exact bytes, and never written over a change made elsewhere (ADR 0005).
 */
export function createOutlineRepository({ folders }: { folders: ProjectFolders }): OutlineRepository {
  // The last reading of each outline, so an edit doesn't read the same text twice (Milestone 6, performance).
  const lastRead = new Map<string, ParsedOutline>()
  const documentOf = (root: string, file: ProjectPath, text: string, revision: Revision): OutlineDocument => {
    const parsed = readOutline(text)
    lastRead.set(`${root}\u0000${file}`, parsed)
    return {
      file,
      outline: outlineOf(parsed),
      revision,
      nestingUnit: parsed.nestingUnit,
      invalidDetails: parsed.frontmatter?.valid === false,
    }
  }

  return {
    async listOutlines(root) {
      const store = folders.open(root)
      const files = (await store.listMarkdownFiles()).filter((file) => file.startsWith(`${OUTLINES_FOLDER}/`)).sort()
      return Promise.all(
        files.map(async (file) => {
          const read = await store.read(file)
          return { file, title: read.ok ? (readOutline(read.value.text).title?.text.trim() ?? null) : null }
        }),
      )
    },

    async createOutline(root, title) {
      const name = title.trim()
      if (name === '') return err('empty-text')
      if (/[\r\n]/.test(name)) return err('multiline-text')
      const store = folders.open(root)
      const content = { text: newOutlineFile(name), hasBom: false }
      // A name taken between listing and writing is refused (`expected: null`), so look again.
      for (let attempt = 0; attempt < 3; attempt++) {
        const file = outlineFileFor(name, await store.listMarkdownFiles())
        const written = await store.write(file, content, null)
        if (written.ok) return ok(documentOf(root, file, content.text, written.value))
        if (written.error.code !== 'stale') break
      }
      return err('write-failed')
    },

    async readOutline(root, file) {
      const read = await folders.open(root).read(file)
      if (!read.ok) return err(read.error === 'missing' ? 'missing' : 'unreadable')
      return ok(documentOf(root, file, read.value.text, read.value.revision))
    },

    async editOutline(root, file, edit, expected, nestingUnit) {
      const store = folders.open(root)
      const current = await store.read(file)
      if (!current.ok) return err(current.error === 'missing' ? 'missing' : 'unreadable')
      if (current.value.revision !== expected) return err('stale')
      const parsed = lastRead.get(`${root}\u0000${file}`)
      const edited = editOutline(current.value.text, edit, { ...(nestingUnit ? { nestingUnit } : {}), ...(parsed ? { parsed } : {}) })
      if (!edited.ok) return err(edited.error)
      const written = await store.write(file, { text: edited.value, hasBom: current.value.hasBom }, expected)
      if (!written.ok) return err(written.error.code === 'stale' ? 'stale' : 'write-failed')
      return ok({ document: documentOf(root, file, edited.value, written.value), previous: current.value.text })
    },

    async restoreOutline(root, file, text, expected) {
      const store = folders.open(root)
      const current = await store.read(file)
      if (!current.ok) return err(current.error === 'missing' ? 'missing' : 'unreadable')
      if (current.value.revision !== expected) return err('stale')
      const written = await store.write(file, { text, hasBom: current.value.hasBom }, expected)
      if (!written.ok) return err(written.error.code === 'stale' ? 'stale' : 'write-failed')
      return ok(documentOf(root, file, text, written.value))
    },
  }
}

/** The markdown package's source model, as the domain's outline (ADR 0003, point 7). */
export function outlineOf(parsed: ParsedOutline): Outline {
  const slice = (range: { start: number; end: number }): string => parsed.source.slice(range.start, range.end)
  const item = (source: OutlineItemSource): OutlineItem => ({
    text: source.text,
    checked: source.checked,
    children: source.children.map(item),
    keptAsWritten: source.kept.map((block) => slice(block.range)),
    movable: source.movable,
  })
  return {
    title: parsed.title?.text ?? null,
    preamble: parsed.preamble.map((block) => slice(block.range)),
    sections: parsed.sections.map((section) => ({
      name: section.heading?.text ?? null,
      intro: section.intro.map(slice),
      items: section.items.map(item),
      notes: section.kept.map((block): OutlineNote => ({
        kind: block.reason === 'subheading' ? 'group' : 'kept',
        text: block.reason === 'subheading' ? slice(block.range).replace(/^ {0,3}#{1,6}[ \t]*|[ \t]+#+[ \t]*$/g, '') : slice(block.range),
        before: section.items.filter((card) => card.lineRange.start < block.range.start).length,
      })),
    })),
  }
}
