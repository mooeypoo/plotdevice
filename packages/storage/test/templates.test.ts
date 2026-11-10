import { createJournalStore, createProjectFolders } from '@plotdevice/fs-node'
import { readOutline } from '@plotdevice/markdown'
import { OFFERED_STARTERS, projectTemplate, starter, STARTER_IDS, TEMPLATE_IDS, type TemplateId } from '@plotdevice/templates'
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { checkProject, createProjectRepository } from '../src/index'

// Every template, in every language, makes a book that passes the project check and opens without a
// single write (Milestone 19, DOMAIN_AND_FILE_FORMAT.md "Templates").
const dirs: string[] = []
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

async function create(template: TemplateId, language: string, title = 'The Sunken Crown') {
  const base = await mkdtemp(join(tmpdir(), 'plotdevice-template-'))
  dirs.push(base)
  let n = 0
  const folders = createProjectFolders()
  const repository = createProjectRepository({
    folders,
    journals: createJournalStore(join(base, 'app-data')),
    ids: { next: (prefix) => `${prefix}-t${++n}` },
  })
  const created = await repository.create(base, { title, language }, projectTemplate(template, language))
  if (!created.ok) throw new Error(`${template} (${language}) was refused: ${created.error}`)
  return { base, repository, snapshot: created.value, root: created.value.root, store: folders.open(created.value.root) }
}

async function files(root: string): Promise<Record<string, string>> {
  const all: Record<string, string> = {}
  for (const entry of await readdir(root, { recursive: true, withFileTypes: true }))
    if (entry.isFile())
      all[
        join(entry.parentPath, entry.name)
          .slice(root.length + 1)
          .replaceAll('\\', '/')
      ] = await readFile(join(entry.parentPath, entry.name), 'utf8')
  return all
}

const cases = TEMPLATE_IDS.flatMap((template) => ['en', 'he'].map((language) => [template, language] as const))

describe('every template, in every language', () => {
  it.each(cases)('%s (%s) passes the project check and opens without a write', async (template, language) => {
    const { repository, snapshot, root, store } = await create(template, language)
    expect(snapshot.warnings).toEqual([])
    expect((await checkProject(store)).findings).toEqual([])
    const before = await files(root)
    const reopened = await repository.open(root)
    expect(reopened.ok && reopened.value.warnings).toEqual([])
    expect(await files(root)).toEqual(before)
    for (const [file, text] of Object.entries(before))
      if (file.startsWith('outlines/')) expect(readOutline(text).warnings, file).toEqual([])
  })
})

describe('what each template makes', () => {
  it('a novel: the three kinds, chapters, Main story and Loose ideas, suggested tags, no chapter', async () => {
    const { snapshot, root } = await create('novel', 'en')
    expect(snapshot.details.kinds.map((kind) => kind.folder)).toEqual(['characters', 'places', 'notes'])
    expect(snapshot.details.manuscriptUnit).toBeNull()
    expect(snapshot.details.suggestedTags).toEqual(['Main character', 'Secondary'])
    expect(snapshot.contents.entries).toEqual([])
    expect(Object.keys(await files(root)).sort()).toEqual([
      'CONTENTS.md',
      'outlines/loose-ideas.md',
      'outlines/main-story.md',
      'project.md',
    ])
    expect(await readFile(join(root, 'project.md'), 'utf8')).toBe(
      '---\ntitle: The Sunken Crown\nlanguage: en\nchapterNumbering: continuous\nid: prj-t1\nschemaVersion: 1\nsuggestedTags: [Main character, Secondary]\nmainOutline: outlines/main-story.md\n---\n',
    )
    expect(snapshot.details.mainOutline).toBe('outlines/main-story.md')
    expect(await readFile(join(root, 'outlines/main-story.md'), 'utf8')).toMatch(
      /^# Main story\n\n## Beginning\n\n- The hero's ordinary life\n/,
    )
  })

  it('a short story: characters and notes, and one empty chapter named after the book, in the contents', async () => {
    const { snapshot, root } = await create('short-story', 'en', 'Salt')
    expect(snapshot.details.kinds.map((kind) => kind.folder)).toEqual(['characters', 'notes'])
    expect(snapshot.chapters.map((chapter) => [chapter.file, chapter.listed])).toEqual([['manuscript/salt.md', true]])
    expect(await readFile(join(root, 'CONTENTS.md'), 'utf8')).toBe('# Salt\n\n- [Salt](manuscript/salt.md)\n')
    expect(await readFile(join(root, 'manuscript/salt.md'), 'utf8')).toBe('---\ntitle: Salt\nid: ch-t2\n---\n')
  })

  it('a poetry collection: notes, poems, sections, an outline, and one untitled poem ready to write', async () => {
    const { snapshot, root } = await create('poetry', 'en', 'Salt Hours')
    expect(snapshot.details).toMatchObject({
      kinds: [{ folder: 'notes' }],
      manuscriptUnit: { one: 'Poem', many: 'Poems' },
      partUnit: { one: 'Section', many: 'Sections' },
      chapterForm: 'poem',
      suggestedTags: ['Draft', 'Ready'],
      mainOutline: 'outlines/order-of-the-collection.md',
    })
    expect(snapshot.chapters).toMatchObject([{ file: 'manuscript/poem.md', title: '', form: 'poem', listed: true }])
    expect(await readFile(join(root, 'manuscript/poem.md'), 'utf8')).toBe('---\ntitle: ""\nid: ch-t2\nform: poem\n---\n')
    expect(await readFile(join(root, 'project.md'), 'utf8')).toMatch(
      /\npartUnit:\n {2}one: Section\n {2}many: Sections\nchapterForm: poem\n/,
    )
  })

  it('a Hebrew poetry collection: שירים in אסופות, and the outline in Hebrew', async () => {
    const { snapshot, root } = await create('poetry', 'he', 'שעות מלח')
    expect(snapshot.details.manuscriptUnit).toEqual({ one: 'שיר', many: 'שירים' })
    expect(snapshot.details.partUnit).toEqual({ one: 'אסופה', many: 'אסופות' })
    expect(snapshot.chapters.map((chapter) => chapter.file)).toEqual(['manuscript/שיר.md'])
    expect(await readFile(join(root, 'outlines/סדר-הספר.md'), 'utf8')).toMatch(/^# סדר הספר\n\n## אסופה ראשונה\n/)
  })

  it('a campaign: five kinds of its own, sessions, the arc and the session plan', async () => {
    const { snapshot, root } = await create('campaign', 'en')
    expect(snapshot.details.kinds).toEqual([
      { folder: 'npcs', one: 'NPC', many: 'NPCs' },
      { folder: 'locations', one: 'Location', many: 'Locations' },
      { folder: 'factions', one: 'Faction', many: 'Factions' },
      { folder: 'items', one: 'Item', many: 'Items' },
      { folder: 'lore', one: 'Lore', many: 'Lore' },
    ])
    expect(snapshot.details.manuscriptUnit).toEqual({ one: 'Session', many: 'Sessions' })
    expect(snapshot.details.suggestedTags).toEqual(['Player character', 'Villain', 'Ally'])
    expect(Object.keys(await files(root)).filter((file) => file.startsWith('outlines/'))).toEqual(
      expect.arrayContaining(['outlines/campaign-arc.md', 'outlines/session-plan.md']),
    )
  })

  it('a Hebrew campaign: Hebrew kinds, folders, sessions and outline headings', async () => {
    const { snapshot, root } = await create('campaign', 'he', 'הכתר השקוע')
    expect(snapshot.details.kinds.map((kind) => kind.folder)).toEqual(['דמויות', 'מקומות', 'פלגים', 'חפצים', 'ידע'])
    expect(snapshot.details.manuscriptUnit).toEqual({ one: 'מפגש', many: 'מפגשים' })
    expect(await readFile(join(root, 'outlines/תוכנית-למפגש.md'), 'utf8')).toMatch(/^# תוכנית למפגש\n\n## בפעם הקודמת\n/)
    // The template's first outline is main, though it doesn't come first by file name.
    expect(snapshot.details.mainOutline).toBe('outlines/תוכנית-למפגש.md')
  })

  it('blank: exactly what a new project always had', async () => {
    const { root } = await create('blank', 'en')
    expect(Object.keys(await files(root)).sort()).toEqual(['CONTENTS.md', 'project.md'])
    expect(await readFile(join(root, 'project.md'), 'utf8')).not.toMatch(/kinds|manuscriptUnit|suggestedTags|mainOutline/)
  })

  it('never writes over an existing folder', async () => {
    const { base, repository, root } = await create('short-story', 'en', 'Salt')
    const before = await files(root)
    expect(await repository.create(base, { title: 'Salt', language: 'en' }, projectTemplate('short-story', 'en'))).toEqual({
      ok: false,
      error: 'folder-exists',
    })
    expect(await files(root)).toEqual(before)
  })

  it('takes every id from the new book, none from the template', () => {
    for (const [template, language] of cases) expect(JSON.stringify(projectTemplate(template, language))).not.toMatch(/\bid:|prj-|ch-/)
  })
})

describe('starter outlines', () => {
  it.each(STARTER_IDS.flatMap((id) => ['en', 'he'].map((language) => [id, language] as const)))(
    '%s (%s) has a title and reads as an outline with no warnings',
    (id, language) => {
      const { title, body } = starter(id, language)
      expect(title).not.toBe('')
      expect(body).not.toMatch(/^#\s/)
      expect(readOutline(`# ${title}\n\n${body}`).warnings).toEqual([])
    },
  )

  it('are the same starters in both languages, with the same sections', () => {
    for (const id of OFFERED_STARTERS) {
      const sections = (language: string) => starter(id, language).body.match(/^## /gm)?.length
      expect(sections('he'), id).toBe(sections('en'))
    }
  })
})
