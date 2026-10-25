import { err, ok, type ProjectPath } from '@plotdevice/shared'
import { describe, expect, it } from 'vitest'
import type { Revision } from '../ports/file-store'
import type { ChapterFile, ProjectRepository, ProjectSnapshot } from '../ports/project-repository'
import { createWritingSession, type SessionEvent } from './writing-session'

const p = (path: string) => path as ProjectPath
const ROOT = '/books/salt-orchard'
const FROST = p('manuscript/frost.md')
const SALT = p('manuscript/salt.md')

/**
 * Chapter files in memory, standing in for the storage adapter. A revision is derived from the text,
 * as on disk (same bytes, same revision). `elsewhere` edits a file the way another app would.
 */
function memoryRepository(initial: Record<string, string>) {
  const disk = new Map<string, { text: string; title: string }>(Object.entries(initial).map(([file, text]) => [file, { text, title: file }]))
  const revisionOf = (file: string): Revision | undefined => {
    const entry = disk.get(file)
    return entry ? (`r:${entry.title}:${entry.text}` as Revision) : undefined
  }
  const writes: { file: string; text: string }[] = []
  const snapshot = (): ProjectSnapshot => ({
    root: ROOT,
    details: { title: 'The Salt Orchard', language: 'en', chapterNumbering: 'continuous', schemaVersion: 1 },
    contents: { entries: [...disk.keys()].map((file) => ({ kind: 'chapter' as const, file: p(file), linkText: file })) },
    contentsRevision: 'r:contents' as Revision,
    chapters: [...disk.keys()].map((file): ChapterFile => {
      const revision = revisionOf(file)
      return { file: p(file), title: disk.get(file)?.title ?? file, status: 'ok', listed: true, ...(revision ? { revision } : {}) }
    }),
    missing: [],
    outdatedLinkText: [],
    relinkSuggestions: [],
    duplicateIds: [],
    warnings: [],
    recovered: [],
  })
  const unknown = async (): Promise<never> => {
    throw new Error('not used in these tests')
  }
  const repository: ProjectRepository = {
    create: unknown,
    open: async () => ok(snapshot()),
    changeContents: async () => ok(snapshot()),
    async renameChapter(given, file, title) {
      const entry = disk.get(file)
      if (!entry) return err('not-found')
      if (given.chapters.find((c) => c.file === file)?.revision !== revisionOf(file)) return err('stale')
      entry.title = title
      return ok(snapshot())
    },
    async renameChapterFile(given, file, newName) {
      const entry = disk.get(file)
      if (!entry) return err('not-found')
      if (given.chapters.find((c) => c.file === file)?.revision !== revisionOf(file)) return err('stale')
      const to = p(`manuscript/${newName}.md`)
      disk.delete(file)
      disk.set(to, entry)
      return ok({ snapshot: snapshot(), file: to, linksUpdated: 0, filesChanged: [] })
    },
    async readChapter(_root, file) {
      const entry = disk.get(file)
      const revision = revisionOf(file)
      return entry && revision ? ok({ text: entry.text, revision }) : err('missing')
    },
    async saveChapter(_root, file, text, expected) {
      await Promise.resolve()
      const entry = disk.get(file)
      if (!entry) return err('missing')
      if (revisionOf(file) !== expected) return err('stale')
      entry.text = text
      writes.push({ file, text })
      return ok(revisionOf(file) as Revision)
    },
    async saveChapterCopy(_root, file, text, label) {
      const copy = p(file.replace(/\.md$/, `-${label.replace(/ /g, '-')}.md`))
      disk.set(copy, { text, title: `${file} (${label})` })
      return ok(copy)
    },
  }
  const elsewhere = (file: string, text: string): void => {
    const entry = disk.get(file)
    if (entry) entry.text = text
    else disk.set(file, { text, title: file })
  }
  return { repository, disk, writes, elsewhere }
}

async function openSession(files: Record<string, string> = { [FROST]: 'Frost.\n', [SALT]: 'Salt.\n' }) {
  const memory = memoryRepository(files)
  const session = createWritingSession({ repository: memory.repository, copyLabel: () => 'my version' })
  const events: SessionEvent[] = []
  session.onEvent((event) => events.push(event))
  const opened = await session.openProject(ROOT)
  if (!opened.ok) throw new Error(opened.error)
  return { ...memory, session, events }
}

async function openChapter(session: Awaited<ReturnType<typeof openSession>>['session'], file: ProjectPath) {
  const opened = await session.openChapter(file)
  if (!opened.ok) throw new Error(opened.error)
  return opened.value
}

describe('writing session', () => {
  it('saves what the author types and reports it saved', async () => {
    const { session, disk, events } = await openSession()
    const frost = await openChapter(session, FROST)
    expect(frost.text).toBe('Frost.\n')
    session.saveChapter(FROST, 'Frost came early.\n', frost.generation)
    await session.idle()
    expect(disk.get(FROST)?.text).toBe('Frost came early.\n')
    expect(events.filter((e) => e.kind === 'save-status').map((e) => e.kind === 'save-status' && e.status.kind)).toEqual(['unsaved', 'saving', 'saved'])
  })

  it('shows the newest text when the author returns to a chapter that is still saving', async () => {
    const { session } = await openSession()
    const frost = await openChapter(session, FROST)
    session.saveChapter(FROST, 'Typed just before switching.\n', frost.generation)
    await openChapter(session, SALT)
    expect((await openChapter(session, FROST)).text).toBe('Typed just before switching.\n')
  })

  it('reloads an unedited chapter quietly when another app changes it', async () => {
    const { session, elsewhere, events } = await openSession()
    const frost = await openChapter(session, FROST)
    elsewhere(FROST, 'Changed in another app.\n')
    await session.fileChanged(FROST)
    expect(events.at(-1)).toEqual({ kind: 'chapter-reloaded', file: FROST, text: 'Changed in another app.\n', generation: frost.generation + 1 })
  })

  it("does not reload after the app's own save", async () => {
    const { session, events } = await openSession()
    const frost = await openChapter(session, FROST)
    session.saveChapter(FROST, 'Mine.\n', frost.generation)
    await session.idle()
    await session.fileChanged(FROST)
    expect(events.some((e) => e.kind === 'chapter-reloaded')).toBe(false)
  })

  it('never saves text typed into a version that has since been reloaded', async () => {
    const { session, elsewhere, disk } = await openSession()
    const frost = await openChapter(session, FROST)
    elsewhere(FROST, 'Changed in another app.\n')
    await session.fileChanged(FROST)
    session.saveChapter(FROST, 'Frost. Typed before the reload arrived.\n', frost.generation)
    await session.idle()
    expect(disk.get(FROST)?.text).toBe('Changed in another app.\n')
    expect(session.saveStatus(FROST)).toEqual({ kind: 'conflict', unsaved: 'Frost. Typed before the reload arrived.\n' })
  })

  describe('a chapter changed elsewhere while the author has unsaved edits (scenario G)', () => {
    async function inConflict() {
      const opened = await openSession()
      const frost = await openChapter(opened.session, FROST)
      opened.elsewhere(FROST, 'Theirs.\n')
      opened.session.saveChapter(FROST, 'Mine.\n', frost.generation)
      await opened.session.idle()
      expect(opened.session.saveStatus(FROST)).toEqual({ kind: 'conflict', unsaved: 'Mine.\n' })
      expect(opened.disk.get(FROST)?.text).toBe('Theirs.\n')
      return { ...opened, frost }
    }

    it('"keep both" saves mine as a copy and shows theirs, then saving resumes', async () => {
      const { session, disk, frost } = await inConflict()
      const resolved = await session.resolveConflict(FROST, 'keep-both')
      expect(resolved).toEqual({ ok: true, value: { copy: 'manuscript/frost-my-version.md', text: 'Theirs.\n', generation: frost.generation + 1 } })
      expect(disk.get('manuscript/frost-my-version.md')?.text).toBe('Mine.\n')
      expect(session.project()?.chapters.map((c) => c.file)).toContain('manuscript/frost-my-version.md')
      session.saveChapter(FROST, 'Theirs, continued.\n', frost.generation + 1)
      await session.idle()
      expect(disk.get(FROST)?.text).toBe('Theirs, continued.\n')
    })

    it('"use my version" replaces the file only once chosen', async () => {
      const { session, disk, frost } = await inConflict()
      expect(await session.resolveConflict(FROST, 'use-mine')).toEqual({ ok: true, value: { copy: null, text: 'Mine.\n', generation: frost.generation } })
      expect(disk.get(FROST)?.text).toBe('Mine.\n')
      expect(session.saveStatus(FROST)?.kind).toBe('saved')
    })

    it('keeps the conflict when there is none to resolve', async () => {
      const { session } = await openSession()
      await openChapter(session, FROST)
      expect(await session.resolveConflict(FROST, 'use-mine')).toEqual({ ok: false, error: 'no-conflict' })
    })
  })

  it('renames an open chapter while the author types, without a false conflict', async () => {
    const { session, disk } = await openSession()
    const frost = await openChapter(session, FROST)
    session.saveChapter(FROST, 'Before the rename.\n', frost.generation)
    const renamed = session.renameChapter(FROST, 'Early Frost')
    session.saveChapter(FROST, 'After the rename.\n', frost.generation)
    expect((await renamed).ok).toBe(true)
    await session.idle()
    expect(disk.get(FROST)).toEqual({ text: 'After the rename.\n', title: 'Early Frost' })
    expect(session.saveStatus(FROST)?.kind).toBe('saved')
  })

  it('changes an open file between saves, so typing during the change raises no conflict', async () => {
    const { session, disk } = await openSession()
    const frost = await openChapter(session, FROST)
    session.saveChapter(FROST, 'Typed before.\n', frost.generation)
    const changed = session.updateFile(FROST, async () => {
      const entry = disk.get(FROST)
      if (entry) entry.title = 'Retitled elsewhere in the file'
      return { ok: true, value: undefined }
    })
    session.saveChapter(FROST, 'Typed during.\n', frost.generation)
    expect((await changed).ok).toBe(true)
    await session.idle()
    expect(disk.get(FROST)).toEqual({ text: 'Typed during.\n', title: 'Retitled elsewhere in the file' })
    expect(session.saveStatus(FROST)?.kind).toBe('saved')
  })

  it('keeps saving an open chapter after its file is renamed', async () => {
    const { session, disk } = await openSession()
    const frost = await openChapter(session, FROST)
    session.saveChapter(FROST, 'Saved before.\n', frost.generation)
    const renamed = await session.renameChapterFile(FROST, 'early-frost')
    expect(renamed.ok && renamed.value.file).toBe('manuscript/early-frost.md')
    session.saveChapter(p('manuscript/early-frost.md'), 'Saved after.\n', frost.generation)
    await session.idle()
    expect(disk.get('manuscript/early-frost.md')?.text).toBe('Saved after.\n')
    expect(disk.has(FROST)).toBe(false)
  })

  it('refreshes the project after changes elsewhere, keeping open chapters renamable', async () => {
    const { session, elsewhere } = await openSession()
    const frost = await openChapter(session, FROST)
    session.saveChapter(FROST, 'Saved here.\n', frost.generation)
    await session.idle()
    elsewhere('manuscript/added-elsewhere.md', 'New.\n')
    await session.refreshProject()
    expect(session.project()?.chapters.map((c) => c.file)).toContain('manuscript/added-elsewhere.md')
    expect((await session.renameChapter(FROST, 'Early Frost')).ok).toBe(true)
  })

  it("doesn't announce a refresh that found only the app's own saves", async () => {
    const { session, events } = await openSession()
    const frost = await openChapter(session, FROST)
    session.saveChapter(FROST, 'Saved here.\n', frost.generation)
    await session.idle()
    const before = events.filter((e) => e.kind === 'project-changed').length
    await session.refreshProject()
    expect(events.filter((e) => e.kind === 'project-changed')).toHaveLength(before)
  })

  it('finishes saving before opening another project', async () => {
    const { session, writes } = await openSession()
    const frost = await openChapter(session, FROST)
    session.saveChapter(FROST, 'Last words.\n', frost.generation)
    await session.openProject(ROOT)
    expect(writes.at(-1)).toEqual({ file: FROST, text: 'Last words.\n' })
  })

  it('refuses chapter work with no project open', async () => {
    const session = createWritingSession({ repository: memoryRepository({}).repository, copyLabel: () => 'my version' })
    expect(await session.openChapter(FROST)).toEqual({ ok: false, error: 'no-project' })
  })
})
