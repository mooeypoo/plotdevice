import type { PlotDeviceApi } from '../../../contract/api'
import type {
  EntryPropertiesDto,
  ManuscriptDto,
  CodexListingDto,
  CodexPropertiesDto,
  ProjectChangeDto,
  ProjectSummaryDto,
  RenamePlanDto
} from '../../../contract/dtos'

/** A project summary for tests. */
export const sampleSummary: ProjectSummaryDto = {
  root: '/novels/salt-orchard',
  title: 'The Salt Orchard',
  formatVersion: 1,
  readOnly: false,
  warnings: [],
  counts: { part: 1, chapter: 2, character: 0, location: 0, note: 0, scene: 0, untyped: 0 },
  problems: []
}

/** A small manuscript for tests: one part with two chapters, and one unordered chapter. */
export const sampleManuscript: ManuscriptDto = {
  parts: [
    {
      path: 'Part One.md',
      title: 'Part One: The Orchard',
      number: 1,
      wordCount: 9,
      chapters: [
        {
          path: 'The Ferry.md',
          title: 'The Ferry',
          number: 1,
          wordCount: 3,
          duplicateOrder: false
        },
        {
          path: 'First frost.md',
          title: 'First frost',
          number: 2,
          wordCount: 4,
          duplicateOrder: false
        }
      ]
    }
  ],
  unnumberedParts: [],
  chapters: [],
  unordered: [
    {
      chapter: { path: 'Lost.md', title: 'Lost', wordCount: 1, duplicateOrder: false },
      reason: 'part-not-found'
    }
  ],
  warnings: [],
  wordCount: 10,
  linkTargets: []
}

/**
 * An in-memory `PlotDeviceApi` for renderer tests. Files are a map of path → text, plus
 * properties per path. A version is the text and a properties revision, so an outside edit to
 * either changes it.
 */
/** A small codex: one character, one location, one note, one untyped file. */
export const sampleCodex: CodexListingDto = {
  entries: [
    {
      path: 'characters/Ilka.md',
      kind: 'character',
      title: 'Ilka',
      aliases: ['Ilk'],
      role: 'lead'
    },
    { path: 'locations/Marrow.md', kind: 'location', title: 'Marrow', aliases: [] },
    { path: 'notes/Research.md', kind: 'note', title: 'Research', aliases: [] }
  ],
  untyped: [{ path: 'Loose thoughts.md' }],
  templates: [
    { kind: 'character', path: 'templates/character.md', exists: false },
    { kind: 'location', path: 'templates/location.md', exists: false },
    { kind: 'note', path: 'templates/note.md', exists: false }
  ]
}

export function createFakePlotDeviceApi(): {
  api: PlotDeviceApi
  files: Map<string, string>
  saves: string[]
  closedProjects: number
  properties: Map<string, EntryPropertiesDto>
  created: string[]
  moves: string[]
  renames: string[]
  renamePlan: { current: RenamePlanDto | null }
  /** Simulates the main process reporting changes made by another program. */
  emitChanges(changes: readonly ProjectChangeDto[]): void
  /** Simulates another program rewriting a file without changing its text (line endings). */
  touch(path: string): void
  /** Codex entries created, and types set on untyped files. */
  codexWrites: string[]
  /** What `refreshProject` returns next. */
  summary: { current: ProjectSummaryDto }
} {
  const files = new Map([
    ['characters/Ilka.md', 'Ilka grafts pear trees.\n'],
    ['locations/Marrow.md', 'A village on the marsh.\n'],
    ['notes/Research.md', 'Smudge pots.\n'],
    ['Part One.md', 'Two words.\n'],
    ['The Ferry.md', 'Three words here.\n'],
    ['First frost.md', 'Four words are here.\n'],
    ['Lost.md', 'One.\n']
  ])
  const state = {
    saves: [] as string[],
    closedProjects: 0,
    created: [] as string[],
    moves: [] as string[],
    renames: [] as string[]
  }
  const renamePlan: { current: RenamePlanDto | null } = { current: null }
  const codexWrites: string[] = []
  let codex: CodexListingDto = sampleCodex
  const codexProperties = new Map<string, CodexPropertiesDto>(
    sampleCodex.entries.map((entry) => [
      entry.path,
      {
        path: entry.path,
        kind: entry.kind,
        title: entry.title,
        aliases: entry.aliases,
        ...(entry.role !== undefined ? { role: entry.role } : {}),
        relationships: [],
        otherKeys: []
      }
    ])
  )
  const summary = { current: sampleSummary }
  const listeners = new Set<(changes: readonly ProjectChangeDto[]) => void>()
  // New chapters join the unordered tray, so the store can open them.
  let manuscript: ManuscriptDto = sampleManuscript
  const countWords = (text: string): number => text.split(/\s+/u).filter(Boolean).length
  const properties = new Map<string, EntryPropertiesDto>(
    [...files.keys()].map((path) => [
      path,
      {
        path,
        kind: path === 'Part One.md' ? 'part' : 'chapter',
        pov: [],
        characters: [],
        location: [],
        threads: []
      }
    ])
  )
  const revisions = new Map<string, number>()
  const versionOf = (path: string): string =>
    `${files.get(path) ?? ''}#${String(revisions.get(path) ?? 0)}`

  const api: PlotDeviceApi = {
    contractVersion: 7,
    workspace: {
      chooseFolder: () => Promise.resolve(null),
      openProject: () => Promise.resolve({ ok: true, value: sampleSummary }),
      initializeProject: (_, title) =>
        Promise.resolve({ ok: true, value: { ...sampleSummary, title } }),
      closeProject: () => {
        state.closedProjects += 1
        return Promise.resolve()
      },
      listRecentProjects: () => Promise.resolve([]),
      removeRecentProject: () => Promise.resolve(),
      refreshProject: () => Promise.resolve({ ok: true, value: summary.current }),
      onProjectChanged: (listener) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      }
    },
    manuscript: {
      getManuscript: () => Promise.resolve({ ok: true, value: manuscript }),
      openEntry: (path) => {
        const text = files.get(path)
        return Promise.resolve(
          text === undefined
            ? { ok: false, error: { code: 'not-found', message: 'gone' } }
            : {
                ok: true,
                value: { path, text, version: versionOf(path), wordCount: countWords(text) }
              }
        )
      },
      saveEntryText: (path, text, version, overwrite) => {
        if (!overwrite && versionOf(path) !== version) {
          return Promise.resolve({
            ok: false,
            error: { code: 'changed-on-disk', message: 'changed' }
          })
        }
        files.set(path, text)
        state.saves.push(text)
        return Promise.resolve({
          ok: true,
          value: { version: versionOf(path), wordCount: countWords(text) }
        })
      },
      getEntryProperties: (path) => {
        const props = properties.get(path)
        return Promise.resolve(
          props === undefined
            ? { ok: false, error: { code: 'not-found', message: 'gone' } }
            : { ok: true, value: { properties: props, version: versionOf(path) } }
        )
      },
      updateEntryProperties: (path, version, changes) => {
        const props = properties.get(path)
        if (props === undefined)
          return Promise.resolve({ ok: false, error: { code: 'not-found', message: 'gone' } })
        if (versionOf(path) !== version) {
          return Promise.resolve({
            ok: false,
            error: { code: 'changed-on-disk', message: 'changed' }
          })
        }
        const next: EntryPropertiesDto = {
          ...props,
          ...(changes.title !== undefined ? { title: changes.title } : {}),
          ...(changes.status !== undefined ? { status: changes.status } : {}),
          ...(changes.pov !== undefined ? { pov: changes.pov.map((t) => `[[${t}]]`) } : {})
        }
        properties.set(path, next)
        revisions.set(path, (revisions.get(path) ?? 0) + 1)
        return Promise.resolve({ ok: true, value: { properties: next, version: versionOf(path) } })
      },
      createChapter: (_, title) => {
        const path = `${title === '' ? 'Untitled chapter' : title}.md`
        files.set(path, '')
        properties.set(path, {
          path,
          kind: 'chapter',
          title,
          pov: [],
          characters: [],
          location: [],
          threads: []
        })
        state.created.push(path)
        manuscript = {
          ...manuscript,
          unordered: [
            ...manuscript.unordered,
            {
              chapter: { path, title, wordCount: 0, duplicateOrder: false },
              reason: 'missing-order'
            }
          ]
        }
        return Promise.resolve({ ok: true, value: { path } })
      },
      createPart: (title) => {
        const path = `${title}/${title}.md`
        state.created.push(path)
        return Promise.resolve({ ok: true, value: { path } })
      },
      renumberPart: () => Promise.resolve({ ok: true, value: { changed: 1, failed: [] } }),
      addStatus: (status) => Promise.resolve({ ok: true, value: ['idea', 'draft', status] }),
      moveChapter: (path, destination) => {
        state.moves.push(
          destination === null
            ? `${path} → unordered`
            : `${path} → ${destination.part ?? 'book'}#${String(destination.index)}`
        )
        return Promise.resolve({ ok: true, value: { path, changed: 1, failed: [] } })
      },
      movePart: (path, index) => {
        state.moves.push(`${path} → #${String(index)}`)
        return Promise.resolve({ ok: true, value: { path, changed: 1, failed: [] } })
      },
      planRename: () => Promise.resolve({ ok: true, value: renamePlan.current }),
      renameEntry: (path) => {
        const newPath = renamePlan.current?.newPath ?? path
        state.renames.push(`${path} → ${newPath}`)
        const text = files.get(path)
        if (text !== undefined) files.set(newPath, text)
        const props = properties.get(path)
        if (props !== undefined) properties.set(newPath, { ...props, path: newPath })
        return Promise.resolve({
          ok: true,
          value: { path: newPath, linkCount: 0, fileCount: 0, skipped: [] }
        })
      }
    },
    codex: {
      listCodex: () => Promise.resolve({ ok: true, value: codex }),
      openEntry: (path) => api.manuscript.openEntry(path),
      saveEntryText: (path, text, version, overwrite) =>
        api.manuscript.saveEntryText(path, text, version, overwrite),
      getProperties: (path) => {
        const props = codexProperties.get(path)
        return Promise.resolve(
          props === undefined
            ? { ok: false, error: { code: 'not-found', message: 'gone' } }
            : { ok: true, value: { properties: props, version: versionOf(path) } }
        )
      },
      updateProperties: (path, version, changes) => {
        const props = codexProperties.get(path)
        if (props === undefined)
          return Promise.resolve({ ok: false, error: { code: 'not-found', message: 'gone' } })
        if (versionOf(path) !== version) {
          return Promise.resolve({
            ok: false,
            error: { code: 'changed-on-disk', message: 'changed' }
          })
        }
        const next: CodexPropertiesDto = {
          ...props,
          ...(changes.title !== undefined ? { title: changes.title } : {}),
          ...(changes.aliases !== undefined ? { aliases: changes.aliases } : {}),
          ...(changes.role !== undefined ? { role: changes.role } : {}),
          ...(changes.born !== undefined ? { born: changes.born } : {})
        }
        codexProperties.set(path, next)
        revisions.set(path, (revisions.get(path) ?? 0) + 1)
        return Promise.resolve({ ok: true, value: { properties: next, version: versionOf(path) } })
      },
      createEntry: (kind, title) => {
        const path = `${kind}s/${title}.md`
        files.set(path, '## Description\n')
        codex = {
          ...codex,
          entries: [...codex.entries, { path, kind, title, aliases: [] }]
        }
        codexProperties.set(path, {
          path,
          kind,
          title,
          aliases: [],
          relationships: [],
          otherKeys: []
        })
        codexWrites.push(`created ${path}`)
        return Promise.resolve({ ok: true, value: { path } })
      },
      editTemplate: (kind) => {
        const path = `templates/${kind}.md`
        if (!files.has(path)) files.set(path, '## Description\n')
        codex = {
          ...codex,
          templates: codex.templates.map((template) =>
            template.kind === kind ? { ...template, exists: true } : template
          )
        }
        codexWrites.push(`template ${kind}`)
        return Promise.resolve({ ok: true, value: { path } })
      },
      setEntryType: (path, type) => {
        codexWrites.push(`${path} → ${type}`)
        codex = { ...codex, untyped: codex.untyped.filter((file) => file.path !== path) }
        return Promise.resolve({ ok: true, value: null })
      },
      planRename: () => Promise.resolve({ ok: true, value: renamePlan.current }),
      renameEntry: (path) => api.manuscript.renameEntry(path),
      getAppearsIn: (path) =>
        Promise.resolve({
          ok: true,
          value:
            path === 'characters/Ilka.md'
              ? [{ path: 'The Ferry.md', title: 'The Ferry', keys: ['pov'] }]
              : []
        })
    },
    inspector: {
      getVocabulary: () =>
        Promise.resolve({
          ok: true,
          value: {
            statuses: ['idea', 'draft'],
            threads: [{ key: 'main', name: 'Main plot' }],
            calendar: 'gregorian'
          }
        }),
      checkStoryDate: (text) =>
        Promise.resolve({
          ok: true,
          value: text === '' ? { kind: 'undated' } : { kind: 'date', description: `On ${text}` }
        })
    },
    app: {
      onBeforeClose: () => () => undefined,
      readyToClose: () => undefined,
      cancelClose: () => undefined
    }
  }
  return {
    api,
    files,
    get saves() {
      return state.saves
    },
    get closedProjects() {
      return state.closedProjects
    },
    properties,
    moves: state.moves,
    codexWrites,
    summary,
    touch: (path) => {
      revisions.set(path, (revisions.get(path) ?? 0) + 1)
    },
    emitChanges: (changes) => {
      for (const listener of listeners) listener(changes)
    },
    renames: state.renames,
    renamePlan,
    get created() {
      return state.created
    }
  }
}
