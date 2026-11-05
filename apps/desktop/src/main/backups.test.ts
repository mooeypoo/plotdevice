import { createBackupSession, createWritingSession } from '@plotdevice/application'
import { createProjectRepository } from '@plotdevice/storage'
import { createAppDataFile, createBookBackups, createJournalStore, createProjectFolders } from '@plotdevice/fs-node'
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

// Backups of each book (Milestone 20), on real folders: the offer, once a day when the book changed,
// clean-up only when the author turned it on, and the two ways to restore.
const HOUR = 3_600_000
const dirs: string[] = []
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

const BOOK: Record<string, string> = {
  'project.md': '---\ntitle: The Salt Orchard\nid: prj-salt\n---\n',
  'CONTENTS.md': '# The Salt Orchard\n\n- [Frost](manuscript/frost.md)\n',
  'manuscript/frost.md': '---\ntitle: Frost\nid: ch-1\n---\n',
}

async function setup(files: Record<string, string> = BOOK) {
  const base = await mkdtemp(join(tmpdir(), 'plotdevice-backup-session-'))
  dirs.push(base)
  const root = join(base, 'books', 'The Salt Orchard')
  const write = async (path: string, text: string) => {
    await mkdir(dirname(join(root, path)), { recursive: true })
    await writeFile(join(root, path), text)
  }
  for (const [path, text] of Object.entries(files)) await write(path, text)
  const folders = createProjectFolders()
  const repository = createProjectRepository({
    folders,
    journals: createJournalStore(join(base, 'app-data')),
    ids: { next: (p) => `${p}-1` },
  })
  const writing = createWritingSession({ repository, copyLabel: () => 'my version' })
  const opened = await writing.openProject(root)
  if (!opened.ok) throw new Error(opened.error)
  let clock = new Date(2026, 10, 5, 14, 30).getTime()
  const session = createBackupSession({
    backups: createBookBackups(),
    records: createAppDataFile(join(base, 'app-data'), 'backups'),
    folders,
    book: writing,
    now: () => clock,
  })
  const folder = join(base, 'Dropbox', 'Plot Device backups')
  await mkdir(folder, { recursive: true })
  return {
    base,
    root,
    folder,
    session,
    writing,
    write,
    later: (hours: number) => (clock += hours * HOUR),
    zips: async () => (await readdir(folder)).sort(),
    read: (path: string) => readFile(join(root, path), 'utf8'),
  }
}

describe('the offer', () => {
  it('comes once, and only when the book has some writing and two pages about its world', async () => {
    const { session, write } = await setup()
    expect(await session.shouldOffer()).toBe(false)
    await write('manuscript/frost.md', '---\ntitle: Frost\nid: ch-1\n---\nThe first frost.\n')
    await write('characters/ilka.md', '# Ilka\n')
    expect(await session.shouldOffer()).toBe(false)
    await write('places/marrow.md', '# Marrow\n')
    expect(await session.shouldOffer()).toBe(true)
    await session.offered()
    expect(await session.shouldOffer()).toBe(false)
  })
})

describe('automatic backups', () => {
  it('none until a folder is chosen; then at once, and once a day when the book changed', async () => {
    const { session, folder, later, write, zips } = await setup()
    expect((await session.runIfDue()).saved).toBeNull()
    await session.setFolder(folder)
    expect((await session.runIfDue()).saved).toBe(join(folder, 'The Salt Orchard backup 2026-11-05 14.30.zip'))
    later(5)
    await write('notes/salt.md', '# Salt\n')
    expect((await session.runIfDue()).saved).toBeNull()
    later(20)
    expect((await session.runIfDue()).saved).toBe(join(folder, 'The Salt Orchard backup 2026-11-06 15.30.zip'))
    later(48)
    expect((await session.runIfDue()).saved).toBeNull()
    expect(await zips()).toHaveLength(2)
    expect((await session.status())?.lastAt).toBe(new Date(2026, 10, 6, 15, 30).getTime())
  })

  it('never deletes anything without a clean-up rule, then only old automatic ones, never the newest', async () => {
    const { session, folder, later, write, zips } = await setup()
    await session.setFolder(folder)
    for (let day = 0; day < 4; day++) {
      await write('notes/day.md', `# Day ${day}\n`)
      await session.runIfDue()
      later(25)
    }
    const manual = await session.backUpNow()
    await writeFile(join(folder, 'my own notes.zip'), 'not ours')
    expect(await zips()).toHaveLength(6)
    await session.setCleanup({ kind: 'keep-newest', count: 2 })
    await write('notes/day.md', '# Day 5\n')
    // "Back up now" counted as that day's backup, so the next automatic one is a day later.
    expect((await session.runIfDue()).saved).toBeNull()
    later(25)
    const run = await session.runIfDue()
    expect(run.removed).toHaveLength(3)
    const left = await zips()
    expect(left).toHaveLength(4)
    expect(left).toContain('my own notes.zip')
    expect(manual.ok && left).toContain(manual.ok ? manual.value.replace(/^.*[\\/]/, '') : '')
  })

  it('says when the folder is gone, and saves nothing elsewhere', async () => {
    const { session, base, folder } = await setup()
    await session.setFolder(folder)
    await rm(join(base, 'Dropbox'), { recursive: true })
    expect((await session.runIfDue()).problem).toBe('missing-folder')
    expect((await session.status())?.problem).toBe('missing-folder')
  })

  it('each book has its own folder, and the last one chosen is offered for the next', async () => {
    const one = await setup()
    await one.session.setFolder(one.folder)
    expect((await one.session.status())?.suggestedFolder).toBe(one.folder)
  })
})

describe('restoring', () => {
  it('lists the book’s backups, previews the difference, and opens one as a copy without touching the book', async () => {
    const { session, folder, write, root } = await setup()
    await session.setFolder(folder)
    await session.runIfDue()
    await write('manuscript/frost.md', '---\ntitle: Frost\nid: ch-1\n---\nRewritten.\n')
    await write('notes/new.md', '# New\n')
    const list = await session.list()
    if (!list.ok) throw new Error(list.error)
    expect(list.value.map((entry) => [entry.name, entry.automatic])).toEqual([['The Salt Orchard backup 2026-11-05 14.30.zip', true]])
    const [newest] = list.value
    if (!newest) throw new Error('no backup listed')
    const file = newest.file
    expect(await session.preview(file)).toEqual({
      ok: true,
      value: { changed: ['manuscript/frost.md'], returning: [], newer: ['notes/new.md'] },
    })
    const copy = await session.restoreAsCopy(file)
    expect(copy).toEqual({ ok: true, value: join(dirname(root), 'The Salt Orchard (2026-11-05 14.30)') })
    expect(await readFile(join(dirname(root), 'The Salt Orchard (2026-11-05 14.30)', 'manuscript/frost.md'), 'utf8')).toBe(
      BOOK['manuscript/frost.md'],
    )
    expect(await readFile(join(root, 'manuscript/frost.md'), 'utf8')).toContain('Rewritten.')
  })

  it('replacing saves the book as it is first, so restoring that backup gives it back byte for byte', async () => {
    const { session, folder, write, read } = await setup()
    await session.setFolder(folder)
    await session.runIfDue()
    const rewritten = '---\ntitle: Frost\nid: ch-1\n---\nRewritten.\n'
    await write('manuscript/frost.md', rewritten)
    const list = await session.list()
    if (!list.ok) throw new Error(list.error)
    const [newest] = list.value
    if (!newest) throw new Error('no backup listed')
    const replaced = await session.restoreReplace(newest.file)
    if (!replaced.ok) throw new Error(replaced.error)
    expect(replaced.value.before).toBe(join(folder, 'The Salt Orchard before restoring 2026-11-05 14.30.zip'))
    expect(await read('manuscript/frost.md')).toBe(BOOK['manuscript/frost.md'])
    const again = await session.restoreReplace(replaced.value.before)
    expect(again.ok).toBe(true)
    expect(await read('manuscript/frost.md')).toBe(rewritten)
  })

  it('refuses a file the list doesn’t offer', async () => {
    const { session, folder, base } = await setup()
    await session.setFolder(folder)
    await writeFile(join(base, 'elsewhere.zip'), 'x')
    expect(await session.restoreReplace(join(base, 'elsewhere.zip'))).toEqual({ ok: false, error: 'not-listed' })
    expect(await session.preview(join(base, 'elsewhere.zip'))).toEqual({ ok: false, error: 'not-listed' })
  })
})
