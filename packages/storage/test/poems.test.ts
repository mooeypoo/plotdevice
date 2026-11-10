import type { IdGenerator } from '@plotdevice/application'
import { createJournalStore, createProjectFolders } from '@plotdevice/fs-node'
import type { ProjectPath } from '@plotdevice/shared'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import poemEn from '../../../tests/fixtures/chapters/poem-en.md?raw'
import poemHe from '../../../tests/fixtures/chapters/poem-he.md?raw'
import { checkProject, createProjectRepository } from '../src/index'

// Poems (ADR 0013): a chapter's `form`, the book's `chapterForm` and `partUnit`, and untitled poems.
const dirs: string[] = []
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

const p = (path: string) => path as ProjectPath
const EN = p('manuscript/evening.md')
const HE = p('manuscript/ערב.md')
const PROSE = '---\ntitle: The Crossing\nid: ch-k3f9\n# kept by hand\n---\nThe letter arrived on a Tuesday.\\\nIt was raining.\n'

async function book(files: Record<string, string>, project = '---\ntitle: Salt Hours\nlanguage: en\n---\n') {
  const root = await mkdtemp(join(tmpdir(), 'plotdevice-poems-'))
  dirs.push(root)
  // Each chapter listed by its own title, as the app writes it.
  const lines = Object.entries(files).map(([file, text]) => `- [${/\ntitle: (.*)\n/.exec(text)?.[1] ?? file}](${file})`)
  const contents = lines.length > 0 ? `# Salt Hours\n\n${lines.join('\n')}\n` : '# Salt Hours\n'
  for (const [path, text] of Object.entries({ 'project.md': project, 'CONTENTS.md': contents, ...files })) {
    await mkdir(dirname(join(root, path)), { recursive: true })
    await writeFile(join(root, path), text)
  }
  let n = 0
  const ids: IdGenerator = { next: (prefix) => `${prefix}-p${++n}` }
  const folders = createProjectFolders()
  const repository = createProjectRepository({ folders, journals: createJournalStore(join(root, '..', 'app-data')), ids })
  const opened = await repository.open(root)
  if (!opened.ok) throw new Error(opened.error)
  return { root, repository, snapshot: opened.value, store: folders.open(root) }
}

const read = (root: string, file: string) => readFile(join(root, file), 'utf8')

describe('a chapter’s form', () => {
  it('is read from the file, in English and in Hebrew with niqqud', async () => {
    const { snapshot } = await book({ [EN]: poemEn, [HE]: poemHe, 'manuscript/crossing.md': PROSE })
    expect(Object.fromEntries(snapshot.chapters.map((c) => [c.file, c.form]))).toEqual({
      [EN]: 'poem',
      [HE]: 'poem',
      'manuscript/crossing.md': 'prose',
    })
    expect(snapshot.chapters.find((c) => c.file === HE)?.title).toBe('עֶרֶב בַּפַּרְדֵּס')
  })

  it('switches on and off by one line, keeping every other byte', async () => {
    const crlf = PROSE.replace(/\n/g, '\r\n')
    const { root, repository, snapshot } = await book({ 'manuscript/crossing.md': crlf })
    const on = await repository.setChapterForm(snapshot, p('manuscript/crossing.md'), 'poem')
    if (!on.ok) throw new Error(on.error)
    expect(await read(root, 'manuscript/crossing.md')).toBe(crlf.replace('# kept by hand\r\n', '# kept by hand\r\nform: poem\r\n'))
    expect(on.value.chapters[0]?.form).toBe('poem')
    const off = await repository.setChapterForm(on.value, p('manuscript/crossing.md'), 'prose')
    expect(off.ok).toBe(true)
    expect(await read(root, 'manuscript/crossing.md')).toBe(crlf)
  })

  it('writes nothing when the form is already right, and refuses a chapter changed since', async () => {
    const { root, repository, snapshot } = await book({ [HE]: poemHe })
    expect((await repository.setChapterForm(snapshot, HE, 'poem')).ok).toBe(true)
    expect(await read(root, HE)).toBe(poemHe)
    await writeFile(join(root, HE), `${poemHe}\nשׁוּרָה מִבַּחוּץ\n`)
    expect(await repository.setChapterForm(snapshot, HE, 'prose')).toEqual({ ok: false, error: 'stale' })
  })

  it('keeps a form it doesn’t know, and treats it as prose', async () => {
    const screenplay = '---\ntitle: Scene\nform: screenplay\n---\nINT. ORCHARD\n'
    const { root, repository, snapshot } = await book({ 'manuscript/scene.md': screenplay })
    expect(snapshot.chapters[0]?.form).toBe('prose')
    expect((await repository.setChapterForm(snapshot, p('manuscript/scene.md'), 'prose')).ok).toBe(true)
    expect(await read(root, 'manuscript/scene.md')).toBe(screenplay)
  })
})

describe('new chapters in a book of poems', () => {
  const POETRY = '---\ntitle: Salt Hours\nlanguage: he\nchapterForm: poem\nmanuscriptUnit:\n  one: שיר\n  many: שירים\n---\n'

  it('start as poems when the book says so, and as prose otherwise', async () => {
    const poems = await book({}, POETRY)
    const added = await poems.repository.changeContents(poems.snapshot, {
      kind: 'add-chapter',
      title: 'שִׁיר הַמֶּלַח',
      placement: { part: null, index: 0 },
    })
    if (!added.ok) throw new Error(added.error)
    expect(added.value.chapters[0]?.form).toBe('poem')
    const prose = await book({})
    const plain = await prose.repository.changeContents(prose.snapshot, {
      kind: 'add-chapter',
      title: 'One',
      placement: { part: null, index: 0 },
    })
    expect(plain.ok && plain.value.chapters[0]?.form).toBe('prose')
  })

  it('can be untitled, known by their first line, with no outdated contents line', async () => {
    const { root, repository, snapshot } = await book({}, POETRY)
    const added = await repository.changeContents(snapshot, { kind: 'add-chapter', title: '  ', placement: { part: null, index: 0 } })
    if (!added.ok) throw new Error(added.error)
    const [poem] = added.value.chapters
    expect(poem).toMatchObject({ file: 'manuscript/שיר.md', title: '', firstLine: null, form: 'poem' })
    expect(await read(root, 'CONTENTS.md')).toBe('# Salt Hours\n\n- [שיר](manuscript/שיר.md)\n')
    await writeFile(
      join(root, 'manuscript/שיר.md'),
      '---\ntitle: ""\nid: ch-p1\nform: poem\n---\n\nהָעֶרֶב **יוֹרֵד**\\\nעַל הַפַּרְדֵּס\n',
    )
    const reopened = await repository.open(root)
    if (!reopened.ok) throw new Error(reopened.error)
    expect(reopened.value.chapters[0]?.firstLine).toBe('הָעֶרֶב יוֹרֵד')
    expect(reopened.value.outdatedLinkText).toEqual([])
  })

  it('refuses an untitled chapter in prose', async () => {
    const { repository, snapshot } = await book({})
    expect(await repository.changeContents(snapshot, { kind: 'add-chapter', title: '', placement: { part: null, index: 0 } })).toEqual({
      ok: false,
      error: 'invalid',
    })
    const titled = await book({ 'manuscript/crossing.md': PROSE })
    expect((await titled.repository.renameChapter(titled.snapshot, p('manuscript/crossing.md'), '')).ok).toBe(false)
  })

  it('lets a poem’s title be emptied, leaving its contents line as it was', async () => {
    const { root, repository, snapshot } = await book({ [EN]: poemEn })
    const renamed = await repository.renameChapter(snapshot, EN, '')
    if (!renamed.ok) throw new Error(renamed.error)
    expect(await read(root, EN)).toBe(poemEn.replace('title: Evening in the Orchard', 'title: ""'))
    expect(renamed.value.chapters[0]).toMatchObject({ title: '', firstLine: 'The evening settles on the orchard' })
    expect(await read(root, 'CONTENTS.md')).toContain(`- [Evening in the Orchard](${EN})`)
  })

  it('switch on and off from the book', async () => {
    const { root, repository, snapshot } = await book({})
    const on = await repository.setNewChapterForm(snapshot, 'poem')
    if (!on.ok) throw new Error(on.error)
    expect(on.value.details.chapterForm).toBe('poem')
    expect(await read(root, 'project.md')).toBe('---\ntitle: Salt Hours\nlanguage: en\nchapterForm: poem\n---\n')
    await repository.setNewChapterForm(on.value, 'prose')
    expect(await read(root, 'project.md')).toBe('---\ntitle: Salt Hours\nlanguage: en\n---\n')
  })

  it('pass the project check', async () => {
    const { store } = await book({ [EN]: poemEn, [HE]: poemHe }, POETRY)
    expect((await checkProject(store)).findings).toEqual([])
  })
})
