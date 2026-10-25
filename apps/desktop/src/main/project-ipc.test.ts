import { createOutlineSession, createRecentProjectsSession, createWritingSession, type SessionEvent } from '@plotdevice/application'
import { channels, type CardLinksView, type CopyVersionResult, type VersionResult, type VersionsView, type OpenChapterResult, type ReferenceResult, type ReferenceSummaryView, type OpenProjectResult, type OutlineResult, type ProjectChangeResult, type ProjectView, type ResolveConflictResult } from '@plotdevice/contracts'
import { createAppDataFile, createBackupStore, createJournalStore, createProjectFolders, randomIdGenerator } from '@plotdevice/fs-node'
import { compileManuscript, createOutlineRepository, createProjectRepository, createReferenceRepository, createVersionRepository, withBackups } from '@plotdevice/storage'
import { access, cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { moveDown, moveUp } from '@plotdevice/presentation'
import type { ProjectPath } from '@plotdevice/shared'
import { createIpcHandlers, type Sender } from './ipc'

const MEDIUM_PAGE = { writingSize: 'medium', pageWidth: 'medium' } as const

const FIXTURE = join(import.meta.dirname, '../../../../tests/fixtures/projects/salt-orchard')
const appUrl = 'file:///opt/plotdevice/out/renderer/index.html'
const appPage: Sender = { url: appUrl, fromAppWindow: true }
const dirs: string[] = []
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

/** The real session, storage and files, on a copy of the sample novel; only the folder dialogs are faked. */
async function setup() {
  const base = await mkdtemp(join(tmpdir(), 'plotdevice-ipc-'))
  dirs.push(base)
  const root = join(base, 'The Salt Orchard')
  await cp(FIXTURE, root, { recursive: true })
  const appData = join(base, 'app-data')
  let clock = Date.UTC(2026, 9, 25, 18)
  const now = () => clock
  const backups = createBackupStore(appData)
  const folders = withBackups(createProjectFolders(), { backups, now })
  const repository = createProjectRepository({ folders, journals: createJournalStore(appData), ids: randomIdGenerator })
  const session = createWritingSession({ repository, copyLabel: () => 'my version' })
  const events: SessionEvent[] = []
  session.onEvent((event) => events.push(event))
  const dialogs = { folder: null as string | null, location: null as string | null, saveAs: null as string | null, suggested: '' }
  let flushed = 0
  const recent = await createRecentProjectsSession(createAppDataFile(appData, 'recent'))
  const outlines = createOutlineSession({ repository: createOutlineRepository({ folders }), root: () => session.project()?.root ?? null })
  const handlers = createIpcHandlers({
    appUrl,
    appInfo: { name: 'Plot Device', version: '0.1.0', platform: 'linux' },
    currentPreferences: () => ({ theme: 'system', locale: 'en', ...MEDIUM_PAGE }),
    updatePreferences: async () => {
      throw new Error('not used')
    },
    projects: {
      session,
      recent,
      chooseProjectFolder: async () => dialogs.folder,
      chooseNewProjectLocation: async () => dialogs.location,
      folderExists: (path) => access(path).then(() => true, () => false),
      onFlushed: () => flushed++,
      chooseSaveLocation: async (suggested) => ((dialogs.suggested = suggested), dialogs.saveAs),
      compile: (snapshot) => compileManuscript(createProjectFolders(), snapshot),
      writeOutside: (path, text) => writeFile(path, text).then(
        () => true,
        () => false,
      ),
    },
    outlines: { outlines, writing: session, recent },
    references: { references: createReferenceRepository({ folders }), writing: session, recent },
    versions: { versions: createVersionRepository({ folders: createProjectFolders(), backups, now }), writing: session, outlines, repository, copyLabel: () => 'version 1' },
  })
  const call = (channel: string, payload?: unknown, sender: Sender = appPage): Promise<unknown> => {
    const handler = handlers[channel]
    if (!handler) throw new Error(`no handler for ${channel}`)
    return handler(sender, payload)
  }
  const read = (path: string) => readFile(join(root, path), 'utf8')
  const advance = (ms: number) => (clock += ms)
  return { base, root, appData, call, read, dialogs, session, events, flushed: () => flushed, advance }
}

async function openChosen(context: Awaited<ReturnType<typeof setup>>): Promise<ProjectView> {
  context.dialogs.folder = context.root
  const opened = (await context.call(channels.openProject, 'choose')) as OpenProjectResult
  if (!opened.ok) throw new Error(opened.error)
  return opened.value.project
}

describe('project calls', () => {
  it.each(Object.values(channels))('%s refuses anything but the app page', async (channel) => {
    const { call } = await setup()
    await expect(call(channel, undefined, { url: 'https://example.com/', fromAppWindow: true })).rejects.toThrow('untrusted-sender')
  })

  it('opens a project the author chose, and remembers it', async () => {
    const context = await setup()
    const project = await openChosen(context)
    expect(project.title).toBe('The Salt Orchard')
    expect(await context.call(channels.getRecentProjects)).toEqual([{ root: context.root, title: 'The Salt Orchard', available: true }])
  })

  it('opens only folders the author chose or opened before', async () => {
    const { call, base } = await setup()
    expect(await call(channels.openProject, { recent: join(base, 'somewhere-else') })).toEqual({ ok: false, error: 'not-recent' })
    expect(await call(channels.openProject, 'choose')).toEqual({ ok: false, error: 'cancelled' })
    await expect(call(channels.openProject, { root: '/etc' })).rejects.toThrow('invalid-payload')
  })

  it('reopens a recent project, shows a moved one as unavailable, and forgets it on request', async () => {
    const context = await setup()
    await openChosen(context)
    expect(await context.call(channels.openProject, { recent: context.root })).toMatchObject({ ok: true })
    await rm(context.root, { recursive: true })
    expect(await context.call(channels.getRecentProjects)).toEqual([{ root: context.root, title: 'The Salt Orchard', available: false }])
    expect(await context.call(channels.forgetRecentProject, { root: context.root })).toEqual([])
  })

  it('refuses chapter paths outside the project', async () => {
    const context = await setup()
    await openChosen(context)
    await expect(context.call(channels.openChapter, { file: '../../secrets.md' })).rejects.toThrow('invalid-payload')
    await expect(context.call(channels.saveChapter, { file: '/etc/passwd', text: 'x', generation: 1 })).rejects.toThrow('invalid-payload')
  })

  it('writes Hebrew and English text and returns to where the author left off (scenario A, core half)', async () => {
    const context = await setup()
    await openChosen(context)
    const chapter = (await context.call(channels.openChapter, { file: 'manuscript/frost.md' })) as OpenChapterResult
    if (!chapter.ok) throw new Error(chapter.error)
    await context.call(channels.saveChapter, { file: 'manuscript/frost.md', text: 'יעל wrote in the app. Ilka read it.\n', generation: chapter.value.generation })
    await context.session.idle()
    expect(await context.read('manuscript/frost.md')).toBe('---\ntitle: Frost\nid: ch-p0n1zz\n---\nיעל wrote in the app. Ilka read it.\n')
    expect(context.events.filter((e) => e.kind === 'save-status').at(-1)).toMatchObject({ status: { kind: 'saved' } })
    await context.call(channels.leftOff, { file: 'manuscript/frost.md', cursor: 12 })
    expect(await context.call(channels.getOpenProject)).toMatchObject({ leftOff: { file: 'manuscript/frost.md', cursor: 12 } })
  })

  it('keeps both texts when a chapter changed elsewhere (scenario G, core half)', async () => {
    const context = await setup()
    await openChosen(context)
    const chapter = (await context.call(channels.openChapter, { file: 'manuscript/frost.md' })) as OpenChapterResult
    if (!chapter.ok) throw new Error(chapter.error)
    const theirs = '---\ntitle: Frost\nid: ch-p0n1zz\n---\nChanged in another app.\n'
    await writeFile(join(context.root, 'manuscript/frost.md'), theirs)
    await context.call(channels.saveChapter, { file: 'manuscript/frost.md', text: 'Mine.\n', generation: chapter.value.generation })
    await context.session.idle()
    expect(context.session.saveStatus(chapter.value.file)?.kind).toBe('conflict')
    const resolved = (await context.call(channels.resolveConflict, { file: 'manuscript/frost.md', choice: 'keep-both' })) as ResolveConflictResult
    if (!resolved.ok) throw new Error(resolved.error)
    expect(resolved.value).toMatchObject({ copy: 'manuscript/frost-my-version.md', text: 'Changed in another app.\n' })
    expect(resolved.value.project.chapters).toContainEqual({ file: 'manuscript/frost-my-version.md', title: 'Frost (my version)', status: 'ok', listed: false })
    expect(await context.read('manuscript/frost.md')).toBe(theirs)
    expect(await context.read('manuscript/frost-my-version.md')).toMatch(/\nMine\.\n$/)
  })

  it('moves each chapter one step in reading order, and back, with the navigator\'s placements', async () => {
    const context = await setup()
    let current = await openChosen(context)
    const order = (view: ProjectView): string[] => view.contents.flatMap((entry) => (entry.kind === 'chapter' ? [entry.file] : [`[${entry.name}]`, ...entry.chapters.map((c) => c.file)]))
    const partOf = (view: ProjectView, file: string): string | null => {
      for (const entry of view.contents) if (entry.kind === 'part' && entry.chapters.some((c) => c.file === file)) return entry.name
      return null
    }
    const move = async (file: ProjectPath, placement: { part: number | null; index: number }) => {
      const moved = (await context.call(channels.changeContents, { kind: 'move-chapter', file, placement })) as ProjectChangeResult
      if (!moved.ok) throw new Error(moved.error)
      current = moved.value
    }
    const original = order(current)
    for (const file of current.chapters.filter((c) => c.listed).map((c) => c.file)) {
      const down = moveDown(current.contents, file)
      if (!down) continue
      const before = order(current)
      const partBefore = partOf(current, file)
      await move(file, down)
      const after = order(current)
      // One step: past the next entry, or across a part boundary (into or out of a part) in place.
      const steppedPast = after.indexOf(file) === before.indexOf(file) + 1
      const crossedBoundary = after.indexOf(file) === before.indexOf(file) && partOf(current, file) !== partBefore
      expect(steppedPast || crossedBoundary).toBe(true)
      expect(after.filter((entry) => entry !== file)).toEqual(before.filter((entry) => entry !== file))
      const up = moveUp(current.contents, file)
      if (!up) throw new Error('no way back up')
      await move(file, up)
      expect(order(current)).toEqual(before)
    }
    expect(order(current)).toEqual(original)
  })

  it('creates a project where the author chooses, or not at all', async () => {
    const context = await setup()
    expect(await context.call(channels.createProject, { title: 'מטע המלח', language: 'he' })).toEqual({ ok: false, error: 'cancelled' })
    context.dialogs.location = context.base
    const created = (await context.call(channels.createProject, { title: 'מטע המלח', language: 'he' })) as OpenProjectResult
    expect(created.ok && created.value.project).toMatchObject({ title: 'מטע המלח', root: join(context.base, 'מטע המלח') })
  })

  it('passes on that the page has flushed its text', async () => {
    const context = await setup()
    await context.call(channels.flushed)
    expect(context.flushed()).toBe(1)
  })
})

describe('outline calls', () => {
  const MAIN = 'outlines/main-story.md'

  it('edits an outline from the page; the file changes and no chapter does', async () => {
    const context = await setup()
    await openChosen(context)
    const chapter = await context.read('manuscript/the-orchard-gate.md')
    const opened = (await context.call(channels.openOutline, { file: MAIN })) as OutlineResult
    expect(opened.ok && opened.value.sections.map((s) => s.name)).toEqual(['Beginning', 'Ending'])
    const moved = (await context.call(channels.editOutline, { file: MAIN, edit: { kind: 'move-item', from: { section: 0, path: [1] }, to: { section: 1, parentPath: [], index: 0 } } })) as OutlineResult
    expect(moved.ok && moved.value.canUndo).toBe(true)
    expect(await context.read(MAIN)).toContain('## Ending\n\n- The gate, see [The Orchard Gate]')
    expect(await context.read('manuscript/the-orchard-gate.md')).toBe(chapter)
    const undone = (await context.call(channels.undoOutline, { file: MAIN })) as OutlineResult
    expect(undone.ok && undone.value.canUndo).toBe(false)
    expect(await context.read(MAIN)).toBe(await readFile(join(FIXTURE, MAIN), 'utf8'))
  })

  it('refuses files outside the outlines folder before reading anything', async () => {
    const context = await setup()
    await openChosen(context)
    await expect(context.call(channels.openOutline, { file: 'manuscript/frost.md' })).rejects.toThrow('invalid-payload')
    await expect(context.call(channels.editOutline, { file: 'project.md', edit: { kind: 'set-title', text: 'x' } })).rejects.toThrow('invalid-payload')
  })

  it('creates and lists outlines in Hebrew', async () => {
    const context = await setup()
    await openChosen(context)
    const created = (await context.call(channels.createOutline, { title: 'קשתות דמויות' })) as OutlineResult
    expect(created.ok && created.value.file).toBe('outlines/קשתות-דמויות.md')
    expect(await context.call(channels.listOutlines)).toEqual([
      { file: 'outlines/main-story.md', title: 'Main story' },
      { file: 'outlines/קשתות-דמויות.md', title: 'קשתות דמויות' },
    ])
  })

  it('remembers the workspace, outline and view for next time', async () => {
    const context = await setup()
    await openChosen(context)
    await context.call(channels.rememberPlace, { workspace: 'story', outline: MAIN, view: 'cards' })
    expect(await context.call(channels.getOpenProject)).toMatchObject({ place: { workspace: 'story', outline: MAIN, view: 'cards' } })
    await expect(context.call(channels.rememberPlace, { workspace: 'Story' })).rejects.toThrow('invalid-payload')
  })
})

describe('reference calls', () => {
  it('names the cards about a chapter and what they link to (scenario D, core half)', async () => {
    const context = await setup()
    await openChosen(context)
    const created = (await context.call(channels.createReference, { kind: 'character', title: 'Ilka Varga' })) as ReferenceResult<ReferenceSummaryView>
    expect(created.ok && created.value.file).toBe('characters/ilka-varga.md')
    await writeFile(join(context.root, 'outlines/arcs.md'), '## Ilka\n\n- She crosses, see [The Crossing](../manuscript/the-crossing.md) and [Ilka](../characters/ilka-varga.md)\n')
    const cards = (await context.call(channels.cardsAbout, { file: 'manuscript/the-crossing.md' })) as CardLinksView[]
    expect(cards.find((card) => card.outline === 'outlines/arcs.md')).toEqual({
      outline: 'outlines/arcs.md',
      outlineTitle: null,
      section: 'Ilka',
      card: 'She crosses, see [The Crossing](../manuscript/the-crossing.md) and [Ilka](../characters/ilka-varga.md)',
      links: [{ file: 'characters/ilka-varga.md', kind: 'character', title: 'Ilka Varga' }],
    })
  })

  it('renames a page that is open and being typed in, without a conflict', async () => {
    const context = await setup()
    await openChosen(context)
    const created = (await context.call(channels.createReference, { kind: 'place', title: 'Marrow' })) as ReferenceResult<ReferenceSummaryView>
    if (!created.ok) throw new Error(created.error)
    const page = (await context.call(channels.openChapter, { file: created.value.file })) as OpenChapterResult
    if (!page.ok) throw new Error(page.error)
    await context.call(channels.saveChapter, { file: created.value.file, text: 'Where the orchard is.\n', generation: page.value.generation })
    const renamed = (await context.call(channels.renameReference, { file: created.value.file, title: 'Marrow, the town' })) as ReferenceResult<ReferenceSummaryView>
    await context.call(channels.saveChapter, { file: created.value.file, text: 'Where the orchard is, by the river.\n', generation: page.value.generation })
    await context.session.idle()
    expect(renamed.ok && renamed.value.title).toBe('Marrow, the town')
    expect(await context.read('places/marrow.md')).toBe('---\ntitle: Marrow, the town\n---\nWhere the orchard is, by the river.\n')
    expect(context.session.saveStatus(created.value.file)?.kind).toBe('saved')
  })

  it('remembers the pinned shelf, and reads only pages', async () => {
    const context = await setup()
    await openChosen(context)
    await context.call(channels.setShelf, { files: ['notes/loose-ideas.md', 'characters/ilka.md'] })
    expect(await context.call(channels.getShelf)).toEqual(['notes/loose-ideas.md', 'characters/ilka.md'])
    await expect(context.call(channels.readReference, { file: 'manuscript/frost.md' })).rejects.toThrow('invalid-payload')
    await expect(context.call(channels.setShelf, { files: ['project.md'] })).rejects.toThrow('invalid-payload')
  })
})

describe('version calls', () => {
  const FROST = 'manuscript/frost.md'

  it('restores an earlier version of an open chapter, which reloads in the editor, and undoes it', async () => {
    const context = await setup()
    await openChosen(context)
    const original = await context.read(FROST)
    const chapter = (await context.call(channels.openChapter, { file: FROST })) as OpenChapterResult
    if (!chapter.ok) throw new Error(chapter.error)
    await context.call(channels.saveChapter, { file: FROST, text: 'Rewritten.\n', generation: chapter.value.generation })
    await context.session.idle()
    context.advance(60_000)

    const listed = (await context.call(channels.listVersions, { file: FROST })) as VersionResult<VersionsView>
    if (!listed.ok) throw new Error(listed.error)
    expect(listed.value.versions).toHaveLength(1)
    expect(await context.call(channels.readVersion, { file: FROST, at: listed.value.versions[0] })).toEqual({ ok: true, value: original })
    expect(await context.call(channels.restoreVersion, { file: FROST, at: listed.value.versions[0], revision: listed.value.revision })).toEqual({ ok: true, value: undefined })
    expect(await context.read(FROST)).toBe(original)
    expect(context.events.filter((e) => e.kind === 'chapter-reloaded').at(-1)).toMatchObject({ file: FROST, text: expect.stringContaining('the frost came early') as string })

    const again = (await context.call(channels.listVersions, { file: FROST })) as VersionResult<VersionsView>
    if (!again.ok) throw new Error(again.error)
    await context.call(channels.restoreVersion, { file: FROST, at: again.value.versions[0], revision: again.value.revision })
    expect(await context.read(FROST)).toBe('---\ntitle: Frost\nid: ch-p0n1zz\n---\nRewritten.\n')
  })

  it('saves an earlier version as a copy, with a new id', async () => {
    const context = await setup()
    await openChosen(context)
    const chapter = (await context.call(channels.openChapter, { file: FROST })) as OpenChapterResult
    if (!chapter.ok) throw new Error(chapter.error)
    await context.call(channels.saveChapter, { file: FROST, text: 'Rewritten.\n', generation: chapter.value.generation })
    await context.session.idle()
    const listed = (await context.call(channels.listVersions, { file: FROST })) as VersionResult<VersionsView>
    if (!listed.ok) throw new Error(listed.error)
    const copied = (await context.call(channels.copyVersion, { file: FROST, at: listed.value.versions[0] })) as CopyVersionResult
    expect(copied.ok && copied.value.copy).toBe('manuscript/frost-version-1.md')
    const copy = await context.read('manuscript/frost-version-1.md')
    expect(copy).toMatch(/^---\ntitle: Frost \(version 1\)\nid: ch-[0-9a-z]{6}\n---\n/)
    expect(copy).not.toContain('ch-p0n1zz')
    expect(copy).toContain('the frost came early')
  })
})

describe('compiling the book', () => {
  it('suggests a file next to the project folder, writes the book there, and leaves the project alone', async () => {
    const context = await setup()
    await openChosen(context)
    expect(await context.call(channels.compileBook)).toEqual({ ok: false, error: 'cancelled' })
    expect(context.dialogs.suggested).toBe(join(context.base, 'The Salt Orchard.md'))
    context.dialogs.saveAs = join(context.base, 'book.md')
    expect(await context.call(channels.compileBook)).toEqual({ ok: true, value: { path: join(context.base, 'book.md'), missing: [] } })
    expect(await readFile(join(context.base, 'book.md'), 'utf8')).toContain('## 4. Frost')
  })
})
