import type { AppMenuCommand, PlotDeviceApi } from '../../../contract/api'
import type {
  ApiResult,
  UiLanguageDto,
  EntryPropertiesDto,
  ManuscriptDto,
  CodexListingDto,
  FolderChoiceDto,
  CodexPropertiesDto,
  ProjectChangeDto,
  OutlineDto,
  OutlinePlacementDto,
  PlotBoardDto,
  ProjectSummaryDto,
  InteractionsDto,
  RenamePlanDto,
  TimelineDto
} from '../../../contract/dtos'

/** A summary's `language` for a declared tag; only Hebrew is right-to-left here. */
function fakeBookLanguage(language: string): ProjectSummaryDto['language'] {
  return { declared: language, direction: language.startsWith('he') ? 'rtl' : 'ltr' }
}

/** A project summary for tests. */
export const sampleSummary: ProjectSummaryDto = {
  root: '/novels/salt-orchard',
  title: 'The Salt Orchard',
  formatVersion: 1,
  language: { declared: null, direction: null },
  readOnly: false,
  warnings: [],
  counts: {
    part: 1,
    chapter: 2,
    character: 0,
    location: 0,
    note: 0,
    outline: 0,
    scene: 0,
    untyped: 0
  },
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
          duplicateOrder: false,
          pov: ['Ilka'],
          threads: ['main']
        },
        {
          path: 'First frost.md',
          title: 'First frost',
          number: 2,
          wordCount: 4,
          duplicateOrder: false,
          pov: [],
          threads: []
        }
      ]
    }
  ],
  unnumberedParts: [],
  chapters: [],
  unordered: [
    {
      chapter: {
        path: 'Lost.md',
        title: 'Lost',
        wordCount: 1,
        duplicateOrder: false,
        pov: [],
        threads: []
      },
      reason: 'part-not-found'
    }
  ],
  warnings: [],
  wordCount: 10,
  linkTargets: [
    { name: 'Ilka', path: 'characters/Ilka.md', type: 'character' },
    { name: 'Aunt Bea', path: 'characters/Aunt Bea.md', type: 'character' },
    { name: 'Marrow', path: 'locations/Marrow.md', type: 'location' },
    { name: 'Research', path: 'notes/Research.md', type: 'note' },
    { name: 'Part One', path: 'Part One.md', type: 'part' },
    { name: 'The Ferry', path: 'The Ferry.md', type: 'chapter' },
    { name: 'First frost', path: 'First frost.md', type: 'chapter' },
    { name: 'Lost', path: 'Lost.md', type: 'chapter' },
    { name: 'Outline', path: 'Outline.md', type: 'outline' }
  ]
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
  ],
  outlines: []
}

/** The fake project's outlines. */
export const sampleOutlines: readonly OutlineDto[] = [{ path: 'Outline.md', title: 'Outline' }]

/** Two dated chapters in Part One, the second earlier in the story; one undated. */
export const sampleTimeline: TimelineDto = {
  calendar: 'gregorian',
  threads: [{ key: 'main', name: 'Main plot', color: '#4f7cac' }],
  characters: [{ key: 'characters/Ilka.md', name: 'Ilka' }],
  chapters: [
    {
      path: 'The Ferry.md',
      title: 'The Ferry',
      number: 1,
      partNumber: 1,
      storyTime: 'morning',
      threads: ['main'],
      characters: [{ path: 'characters/Ilka.md', pov: true }],
      date: {
        kind: 'dated',
        reading: { kind: 'date', date: { calendar: 'gregorian', year: 1952, month: 10, day: 3 } },
        start: -6299,
        end: -6299,
        precision: 'day'
      }
    },
    {
      path: 'First frost.md',
      title: 'First frost',
      number: 2,
      partNumber: 1,
      threads: [],
      characters: [],
      date: {
        kind: 'dated',
        reading: { kind: 'date', date: { calendar: 'gregorian', year: 1952, month: 9 } },
        start: -6331,
        end: -6302,
        precision: 'month'
      }
    },
    {
      path: 'Lost.md',
      title: 'Lost',
      number: 3,
      partNumber: 1,
      threads: ['main'],
      characters: [],
      date: { kind: 'invalid', issue: { reason: 'invalid-day', value: '1952-02-30' } }
    }
  ],
  outside: 0
}

/** Three characters over three chapters: Ilka with Bea once and with יעל twice; Bea and יעל never. */
export const sampleInteractions: InteractionsDto = {
  chapters: [
    { path: 'The Ferry.md', title: 'The Ferry' },
    { path: 'First frost.md', title: 'First frost' },
    { path: 'Lost.md', title: 'Lost' }
  ],
  characters: [
    { path: 'characters/Aunt Bea.md', name: 'Aunt Bea', chapters: [1], povChapters: [] },
    { path: 'characters/Ilka.md', name: 'Ilka', chapters: [0, 1, 2], povChapters: [0] },
    { path: 'characters/יעל.md', name: 'יעל', chapters: [0, 2], povChapters: [2] }
  ],
  outside: 1
}

/** A board for tests: the fake's `Outline.md`, with an Inbox. */
export const sampleBoard: PlotBoardDto = {
  path: 'Outline.md',
  version: 'board-1',
  preamble: '',
  columns: [
    {
      line: 0,
      title: 'Part One',
      inbox: false,
      beats: [
        {
          line: 1,
          title: '[[The Ferry]]: Ilka arrives. #main',
          notes: '',
          tags: ['main'],
          threads: ['main'],
          chapter: {
            path: 'The Ferry.md',
            title: 'The Ferry',
            status: 'draft',
            pov: ['Ilka'],
            wordCount: 3
          }
        },
        { line: 2, title: 'Ilka finds the ledger.', notes: 'Bea lies.', tags: [], threads: [] }
      ]
    }
  ],
  threads: [{ key: 'main', name: 'Main plot', color: '#4f7cac' }]
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
  /** The folder `takeLaunchFolder` returns (once), as if the app was started with it. */
  launch: { folder: FolderChoiceDto | null }
  /** Simulates the app being started again with a folder. */
  openFolder(choice: FolderChoiceDto): void
  /** Simulates either outcome of a later launch's folder inspection. */
  emitFolderResult(result: ApiResult<FolderChoiceDto | null>): void
  /** Simulates the main process reporting changes made by another program. */
  emitChanges(changes: readonly ProjectChangeDto[]): void
  /** Simulates choosing a native menu action. */
  emitMenuCommand(command: AppMenuCommand): void
  /** Simulates another program rewriting a file without changing its text (line endings). */
  touch(path: string): void
  /** A codex entry's properties, to set up a test (for example, relationships it can't edit). */
  codexProperties: Map<string, CodexPropertiesDto>
  /** Codex entries created, and types set on untyped files. */
  codexWrites: string[]
  /** What `getTimeline` returns. */
  timeline: { current: TimelineDto }
  /** What `readBoard` returns, for any outline. */
  board: { current: PlotBoardDto }
  /** Beats captured, as `path: text (version)`. */
  captures: string[]
  /** Board moves, as `beat <title> → <column> <placement>` or `column <title> → <placement>`. */
  boardMoves: string[]
  /** What `refreshProject` returns next. */
  summary: { current: ProjectSummaryDto }
} {
  const files = new Map([
    ['characters/Ilka.md', 'Ilka grafts pear trees.\n'],
    [
      'Outline.md',
      '## Part One\n- [[The Ferry]]: Ilka arrives.\n- [[First frost]]: the frost.\n- Ilka finds the ledger.\n'
    ],
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
  const timeline = { current: sampleTimeline }
  const board = { current: sampleBoard }
  let outlines: readonly OutlineDto[] = sampleOutlines
  const captures: string[] = []
  const boardMoves: string[] = []
  /** A move at a version the board no longer has is refused, as the main process does. */
  const moveBoard = (
    path: string,
    version: string,
    description: string
  ): Promise<ApiResult<PlotBoardDto>> => {
    if (version !== board.current.version) {
      return Promise.resolve({
        ok: false,
        error: {
          code: 'changed-on-disk',
          message: 'changed',
          diagnostic: { reason: 'file-changed', path }
        }
      })
    }
    boardMoves.push(description)
    board.current = { ...board.current, version: `${board.current.version}+` }
    return Promise.resolve({ ok: true, value: { ...board.current, path } })
  }
  const placementText = (placement: OutlinePlacementDto): string =>
    placement === 'end' ? 'end' : `before ${placement.before.title}`
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
        relationshipsEditable: entry.kind === 'character',
        otherKeys: []
      }
    ])
  )
  const summary = { current: sampleSummary }
  const listeners = new Set<(changes: readonly ProjectChangeDto[]) => void>()
  const folderListeners = new Set<(result: ApiResult<FolderChoiceDto | null>) => void>()
  const menuListeners = new Set<(command: AppMenuCommand) => void>()
  let language: UiLanguageDto = { locale: 'en' }
  const languageListeners = new Set<(settings: UiLanguageDto) => void>()
  const launch: { folder: FolderChoiceDto | null } = { folder: null }
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
  const recoverySnapshots = new Map<
    string,
    {
      path: string
      manuscript: EntryPropertiesDto | undefined
      codex: CodexPropertiesDto | undefined
    }
  >()

  const api: PlotDeviceApi = {
    contractVersion: 31,
    uiLanguage: {
      get: () => Promise.resolve(language),
      set: (locale) => {
        language = { locale }
        for (const listener of languageListeners) listener(language)
        return Promise.resolve({ ok: true, value: language })
      },
      onChanged: (listener) => {
        languageListeners.add(listener)
        return () => languageListeners.delete(listener)
      }
    },
    recovery: {
      capture: (path, version) => {
        if (!files.has(path) || versionOf(path) !== version)
          return Promise.resolve({
            ok: false,
            error: {
              code: 'snapshot-unavailable',
              message: 'Snapshot is unavailable.',
              diagnostic: { reason: 'snapshot-unavailable' }
            }
          })
        const token = `snapshot-${String(recoverySnapshots.size)}`
        const manuscriptProperties = properties.get(path)
        const characterProperties = codexProperties.get(path)
        recoverySnapshots.set(token, {
          path,
          manuscript: manuscriptProperties === undefined ? undefined : { ...manuscriptProperties },
          codex: characterProperties === undefined ? undefined : { ...characterProperties }
        })
        return Promise.resolve({ ok: true, value: token })
      },
      saveCopy: (token, text) => {
        const snapshot = recoverySnapshots.get(token)
        if (snapshot === undefined)
          return Promise.resolve({
            ok: false,
            error: {
              code: 'snapshot-unavailable',
              message: 'Snapshot is unavailable.',
              diagnostic: { reason: 'snapshot-unavailable' }
            }
          })
        const source = snapshot.path
        const template = source.startsWith('templates/')
        const base = (template ? source.slice(source.lastIndexOf('/') + 1) : source).replace(
          /\.md$/u,
          ''
        )
        let path = `${base} (recovered).md`
        let number = 2
        while (files.has(path)) {
          path = `${base} (recovered ${String(number)}).md`
          number += 1
        }
        files.set(path, text)
        state.created.push(path)
        const sourceChapter = manuscript.parts
          .flatMap((part) => part.chapters)
          .concat(
            manuscript.chapters,
            manuscript.unordered.map((entry) => entry.chapter)
          )
          .find((chapter) => chapter.path === source)
        const sourcePart = [...manuscript.parts, ...manuscript.unnumberedParts].find(
          (part) => part.path === source
        )
        if (sourcePart !== undefined) {
          manuscript = {
            ...manuscript,
            unnumberedParts: [...manuscript.unnumberedParts, { ...sourcePart, path, chapters: [] }]
          }
        } else if (sourceChapter !== undefined) {
          manuscript = {
            ...manuscript,
            unordered: [
              ...manuscript.unordered,
              { chapter: { ...sourceChapter, path }, reason: 'missing-order' }
            ]
          }
        } else if (outlines.some((outline) => outline.path === source)) {
          outlines = [...outlines, { path, title: 'Recovered outline' }]
        } else {
          const kind = template ? 'note' : (snapshot.codex?.kind ?? 'note')
          codex = {
            ...codex,
            entries: [
              ...codex.entries,
              {
                path,
                kind,
                title: snapshot.codex?.title ?? 'Recovered note',
                aliases: snapshot.codex?.aliases ?? []
              }
            ]
          }
          codexProperties.set(
            path,
            snapshot.codex !== undefined
              ? { ...snapshot.codex, path, kind }
              : {
                  path,
                  kind,
                  title: 'Recovered note',
                  aliases: [],
                  relationships: [],
                  relationshipsEditable: false,
                  otherKeys: []
                }
          )
        }
        if (snapshot.manuscript !== undefined)
          properties.set(path, { ...snapshot.manuscript, path })
        return Promise.resolve({ ok: true, value: { path } })
      }
    },
    workspace: {
      chooseFolder: () => Promise.resolve({ ok: true, value: null }),
      takeLaunchFolder: () => {
        const choice = launch.folder
        launch.folder = null
        return Promise.resolve({ ok: true, value: choice })
      },
      onOpenFolder: (listener) => {
        folderListeners.add(listener)
        return () => folderListeners.delete(listener)
      },
      openProject: () => Promise.resolve({ ok: true, value: sampleSummary }),
      initializeProject: (_, title, language) =>
        Promise.resolve({
          ok: true,
          value: { ...sampleSummary, title, language: fakeBookLanguage(language) }
        }),
      setBookLanguage: (language) => {
        summary.current = { ...summary.current, language: fakeBookLanguage(language) }
        return Promise.resolve({ ok: true, value: summary.current })
      },
      closeProject: () => {
        recoverySnapshots.clear()
        state.closedProjects += 1
        return Promise.resolve()
      },
      listRecentProjects: () => Promise.resolve({ ok: true, value: [] }),
      removeRecentProject: () => Promise.resolve({ ok: true, value: null }),
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
            ? {
                ok: false,
                error: {
                  code: 'not-found',
                  message: 'gone',
                  diagnostic: { reason: 'file-missing', path }
                }
              }
            : {
                ok: true,
                value: { path, text, version: versionOf(path), wordCount: countWords(text) }
              }
        )
      },
      saveEntryText: (path, text, version, overwrite) => {
        if (!files.has(path))
          return Promise.resolve({
            ok: false,
            error: {
              code: 'not-found',
              message: 'gone',
              diagnostic: { reason: 'file-missing', path }
            }
          })
        if (!overwrite && versionOf(path) !== version) {
          return Promise.resolve({
            ok: false,
            error: {
              code: 'changed-on-disk',
              message: 'changed',
              diagnostic: { reason: 'file-changed', path }
            }
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
            ? {
                ok: false,
                error: {
                  code: 'not-found',
                  message: 'gone',
                  diagnostic: { reason: 'file-missing', path }
                }
              }
            : { ok: true, value: { properties: props, version: versionOf(path) } }
        )
      },
      updateEntryProperties: (path, version, changes) => {
        const props = properties.get(path)
        if (props === undefined)
          return Promise.resolve({
            ok: false,
            error: {
              code: 'not-found',
              message: 'gone',
              diagnostic: { reason: 'file-missing', path }
            }
          })
        if (versionOf(path) !== version) {
          return Promise.resolve({
            ok: false,
            error: {
              code: 'changed-on-disk',
              message: 'changed',
              diagnostic: { reason: 'file-changed', path }
            }
          })
        }
        const next: EntryPropertiesDto = {
          ...props,
          ...(changes.title !== undefined ? { title: changes.title } : {}),
          ...(changes.status !== undefined ? { status: changes.status } : {}),
          ...(changes.synopsis !== undefined ? { synopsis: changes.synopsis } : {}),
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
              chapter: { path, title, wordCount: 0, duplicateOrder: false, pov: [], threads: [] },
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
      fixWarning: (path, fix) => {
        state.moves.push(
          fix.kind === 'path-form'
            ? `fix ${path}: ${fix.name} → ${fix.choice}`
            : `fix ${path}: quote ${fix.key}`
        )
        return Promise.resolve({ ok: true, value: null })
      },
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
      listCodex: () => Promise.resolve({ ok: true, value: { ...codex, outlines } }),
      openEntry: (path) => api.manuscript.openEntry(path),
      saveEntryText: (path, text, version, overwrite) =>
        api.manuscript.saveEntryText(path, text, version, overwrite),
      getProperties: (path) => {
        const props = codexProperties.get(path)
        return Promise.resolve(
          props === undefined
            ? {
                ok: false,
                error: {
                  code: 'not-found',
                  message: 'gone',
                  diagnostic: { reason: 'file-missing', path }
                }
              }
            : {
                ok: true,
                value: { properties: props, version: versionOf(path), listedBy: [] }
              }
        )
      },
      updateProperties: (path, version, changes) => {
        const props = codexProperties.get(path)
        if (props === undefined)
          return Promise.resolve({
            ok: false,
            error: {
              code: 'not-found',
              message: 'gone',
              diagnostic: { reason: 'file-missing', path }
            }
          })
        if (versionOf(path) !== version) {
          return Promise.resolve({
            ok: false,
            error: {
              code: 'changed-on-disk',
              message: 'changed',
              diagnostic: { reason: 'file-changed', path }
            }
          })
        }
        if (
          changes.groups !== undefined &&
          (props.kind !== 'character' || props.groupsEditable === false)
        ) {
          return Promise.resolve({
            ok: false,
            error: {
              code: 'cannot-edit',
              message: 'Groups cannot be edited safely. The file was left unchanged.',
              diagnostic: { reason: 'groups-not-editable' }
            }
          })
        }
        const next: CodexPropertiesDto = {
          ...props,
          ...(changes.title !== undefined ? { title: changes.title } : {}),
          ...(changes.aliases !== undefined ? { aliases: changes.aliases } : {}),
          ...(changes.role !== undefined ? { role: changes.role } : {}),
          ...(changes.born !== undefined ? { born: changes.born } : {}),
          ...(changes.groups !== undefined ? { groups: changes.groups } : {})
        }
        codexProperties.set(path, next)
        codex = {
          ...codex,
          entries: codex.entries.map((entry) =>
            entry.path === path
              ? {
                  ...entry,
                  ...(changes.groups !== undefined ? { groups: changes.groups } : {})
                }
              : entry
          )
        }
        revisions.set(path, (revisions.get(path) ?? 0) + 1)
        return Promise.resolve({
          ok: true,
          value: { properties: next, version: versionOf(path), listedBy: [] }
        })
      },
      updateRelationships: (path, version, relationships) => {
        const props = codexProperties.get(path)
        if (props === undefined)
          return Promise.resolve({
            ok: false,
            error: {
              code: 'not-found',
              message: 'gone',
              diagnostic: { reason: 'file-missing', path }
            }
          })
        if (versionOf(path) !== version) {
          return Promise.resolve({
            ok: false,
            error: {
              code: 'changed-on-disk',
              message: 'changed',
              diagnostic: { reason: 'file-changed', path }
            }
          })
        }
        if (props.kind !== 'character') {
          return Promise.resolve({
            ok: false,
            error: {
              code: 'not-a-character',
              message: 'Only characters have relationships.',
              diagnostic: { reason: 'not-a-character' }
            }
          })
        }
        if (!props.relationshipsEditable) {
          return Promise.resolve({
            ok: false,
            error: {
              code: 'cannot-edit',
              message: 'Can’t edit these relationships safely.',
              diagnostic: { reason: 'frontmatter-unsupported', key: 'relationships' }
            }
          })
        }
        const next: CodexPropertiesDto = {
          ...props,
          relationships: relationships.map((relationship) => ({
            ...relationship,
            with: `[[${relationship.with}]]`
          }))
        }
        codexProperties.set(path, next)
        revisions.set(path, (revisions.get(path) ?? 0) + 1)
        return Promise.resolve({
          ok: true,
          value: { properties: next, version: versionOf(path), listedBy: [] }
        })
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
          relationshipsEditable: kind === 'character',
          otherKeys: []
        })
        codexWrites.push(`created ${path}`)
        return Promise.resolve({ ok: true, value: { path } })
      },
      createOutline: (title) => api.outline.create(title),
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
        if (!codex.untyped.some((file) => file.path === path)) {
          return Promise.resolve({
            ok: false,
            error: {
              code: 'not-untyped',
              message: 'That file already has a type.',
              diagnostic: { reason: 'entry-already-typed' }
            }
          })
        }
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
    timeline: {
      getTimeline: () => Promise.resolve({ ok: true, value: timeline.current })
    },
    interactions: {
      getInteractions: () => Promise.resolve({ ok: true, value: sampleInteractions })
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
          value:
            text === ''
              ? { kind: 'undated' }
              : text === '1952-10-03'
                ? { kind: 'date', date: { calendar: 'gregorian', year: 1952, month: 10, day: 3 } }
                : { kind: 'invalid', issue: { reason: 'not-date', value: text } }
        })
    },
    outline: {
      list: () => Promise.resolve({ ok: true, value: outlines }),
      create: (title) => {
        const path = `${title === '' ? 'Outline' : title}.md`
        files.set(path, '')
        outlines = [...outlines, { path, title: title === '' ? 'Outline' : title }]
        codexWrites.push(`outline ${path}`)
        return Promise.resolve({ ok: true, value: { path } })
      },
      openEntry: (path) => api.codex.openEntry(path),
      saveEntryText: (path, text, version, overwrite) =>
        api.codex.saveEntryText(path, text, version, overwrite),
      moveBeat: (path, version, beat, column, placement) =>
        moveBoard(
          path,
          version,
          `beat ${beat.title} → ${column.title} ${placementText(placement)}`
        ),
      moveColumn: (path, version, column, placement) =>
        moveBoard(path, version, `column ${column.title} → ${placementText(placement)}`),
      addBeat: (path, version, column, title, placement) =>
        moveBoard(path, version, `add ${title} → ${column.title} ${placementText(placement)}`),
      addColumn: (path, version, title, placement) =>
        moveBoard(path, version, `add column ${title} ${placementText(placement)}`),
      retitleBeat: (path, version, beat, title) =>
        moveBoard(path, version, `retitle ${beat.title} → ${title}`),
      editNotes: (path, version, beat, notes) =>
        moveBoard(path, version, `notes ${beat.title} → ${notes}`),
      readBoard: (path) => Promise.resolve({ ok: true, value: { ...board.current, path } }),
      capture: (path, text, version) => {
        if (version !== null && versionOf(path) !== version) {
          return Promise.resolve({
            ok: false,
            error: {
              code: 'changed-on-disk',
              message: 'changed',
              diagnostic: { reason: 'file-changed', path }
            }
          })
        }
        files.set(path, `${files.get(path) ?? ''}- ${text}\n`)
        revisions.set(path, (revisions.get(path) ?? 0) + 1)
        captures.push(`${path}: ${text}${version === null ? '' : ' (versioned)'}`)
        return Promise.resolve({ ok: true, value: { version: versionOf(path) } })
      }
    },
    app: {
      onMenuCommand: (listener) => {
        menuListeners.add(listener)
        return () => menuListeners.delete(listener)
      },
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
    timeline,
    board,
    captures,
    boardMoves,
    codexWrites,
    codexProperties,
    summary,
    touch: (path) => {
      revisions.set(path, (revisions.get(path) ?? 0) + 1)
    },
    launch,
    openFolder: (choice) => {
      for (const listener of folderListeners) listener({ ok: true, value: choice })
    },
    emitFolderResult: (result) => {
      for (const listener of folderListeners) listener(result)
    },
    emitChanges: (changes) => {
      for (const listener of listeners) listener(changes)
    },
    emitMenuCommand: (command) => {
      for (const listener of menuListeners) listener(command)
    },
    renames: state.renames,
    renamePlan,
    get created() {
      return state.created
    }
  }
}
