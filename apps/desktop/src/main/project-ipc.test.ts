import { createRecentProjectsSession, createWritingSession, type SessionEvent } from '@plotdevice/application'
import { channels, type OpenChapterResult, type OpenProjectResult, type ProjectChangeResult, type ProjectView, type ResolveConflictResult } from '@plotdevice/contracts'
import { createAppDataFile, createJournalStore, createProjectFolders, randomIdGenerator } from '@plotdevice/fs-node'
import { createProjectRepository } from '@plotdevice/storage'
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
  const repository = createProjectRepository({ folders: createProjectFolders(), journals: createJournalStore(appData), ids: randomIdGenerator })
  const session = createWritingSession({ repository, copyLabel: () => 'my version' })
  const events: SessionEvent[] = []
  session.onEvent((event) => events.push(event))
  const dialogs = { folder: null as string | null, location: null as string | null }
  let flushed = 0
  const handlers = createIpcHandlers({
    appUrl,
    appInfo: { name: 'Plot Device', version: '0.1.0', platform: 'linux' },
    currentPreferences: () => ({ theme: 'system', locale: 'en', ...MEDIUM_PAGE }),
    updatePreferences: async () => {
      throw new Error('not used')
    },
    projects: {
      session,
      recent: await createRecentProjectsSession(createAppDataFile(appData, 'recent')),
      chooseProjectFolder: async () => dialogs.folder,
      chooseNewProjectLocation: async () => dialogs.location,
      folderExists: (path) => access(path).then(() => true, () => false),
      onFlushed: () => flushed++,
    },
  })
  const call = (channel: string, payload?: unknown, sender: Sender = appPage): Promise<unknown> => {
    const handler = handlers[channel]
    if (!handler) throw new Error(`no handler for ${channel}`)
    return handler(sender, payload)
  }
  const read = (path: string) => readFile(join(root, path), 'utf8')
  return { base, root, appData, call, read, dialogs, session, events, flushed: () => flushed }
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
