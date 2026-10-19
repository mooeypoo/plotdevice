import type { PlotDeviceApi } from '../../../contract/api'
import type { ManuscriptDto, ProjectSummaryDto } from '../../../contract/dtos'

/** A project summary for tests. */
export const sampleSummary: ProjectSummaryDto = {
  root: '/novels/preservers',
  title: 'The Preservers',
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
      title: 'Part One: The Harbor',
      number: 1,
      wordCount: 9,
      chapters: [
        { path: 'Arrival.md', title: 'Arrival', number: 1, wordCount: 3, duplicateOrder: false },
        {
          path: 'First night.md',
          title: 'First night',
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
 * An in-memory `PlotDeviceApi` for renderer tests. Files are a map of path → text; a version is
 * the text itself, so an outside edit changes it.
 */
export function createFakePlotDeviceApi(): {
  api: PlotDeviceApi
  files: Map<string, string>
  saves: string[]
  closedProjects: number
} {
  const files = new Map([
    ['Part One.md', 'Two words.\n'],
    ['Arrival.md', 'Three words here.\n'],
    ['First night.md', 'Four words are here.\n'],
    ['Lost.md', 'One.\n']
  ])
  const state = { saves: [] as string[], closedProjects: 0 }
  const countWords = (text: string): number => text.split(/\s+/u).filter(Boolean).length

  const api: PlotDeviceApi = {
    contractVersion: 3,
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
      removeRecentProject: () => Promise.resolve()
    },
    manuscript: {
      getManuscript: () => Promise.resolve({ ok: true, value: sampleManuscript }),
      openEntry: (path) => {
        const text = files.get(path)
        return Promise.resolve(
          text === undefined
            ? { ok: false, error: { code: 'not-found', message: 'gone' } }
            : { ok: true, value: { path, text, version: text, wordCount: countWords(text) } }
        )
      },
      saveEntryText: (path, text, version, overwrite) => {
        const current = files.get(path)
        if (!overwrite && current !== version) {
          return Promise.resolve({
            ok: false,
            error: { code: 'changed-on-disk', message: 'changed' }
          })
        }
        files.set(path, text)
        state.saves.push(text)
        return Promise.resolve({ ok: true, value: { version: text, wordCount: countWords(text) } })
      }
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
    }
  }
}
