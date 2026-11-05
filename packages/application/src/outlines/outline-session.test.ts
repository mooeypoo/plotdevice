import { applyOutlineEdit, type Outline } from '@plotdevice/domain'
import { err, ok, type ProjectPath } from '@plotdevice/shared'
import { describe, expect, it } from 'vitest'
import type { Revision } from '../ports/file-store'
import type { OutlineDocument, OutlineRepository } from '../ports/outline-repository'
import { createOutlineSession, type OutlineEvent } from './outline-session'

const p = (path: string) => path as ProjectPath
const MAIN = p('outlines/main-story.md')
const card = (text: string) => ({ text, checked: null, children: [], keptAsWritten: [], movable: true })
const story = (): Outline => ({
  title: 'Main story',
  preamble: [],
  sections: [
    { name: 'Beginning', intro: [], notes: [], lineUp: null, items: [card('Ilka arrives'), card('The first frost')] },
    { name: 'Ending', intro: [], notes: [], lineUp: null, items: [card('The sale')] },
  ],
})

/** Outlines in memory: the "text" is the outline as JSON, and its revision counts writes. */
function memoryRepository() {
  const files = new Map<string, { outline: Outline; revision: number }>([[MAIN, { outline: story(), revision: 1 }]])
  const rev = (n: number) => `r${n}` as Revision
  const doc = (file: string): OutlineDocument => {
    const entry = files.get(file)
    if (!entry) throw new Error(`no ${file}`)
    return { file: p(file), outline: entry.outline, revision: rev(entry.revision), nestingUnit: null, invalidDetails: false }
  }
  let writes = 0
  const repository: OutlineRepository = {
    listOutlines: async () => [...files.entries()].map(([file, { outline }]) => ({ file: p(file), title: outline.title })),
    async createOutline(_root, title) {
      const file = `outlines/${title.toLowerCase().replace(/ /g, '-')}.md`
      files.set(file, { outline: { title, preamble: [], sections: [] }, revision: 1 })
      return ok(doc(file))
    },
    async readOutline(_root, file) {
      return files.has(file) ? ok(doc(file)) : err('missing')
    },
    async editOutline(_root, file, edit, expected) {
      await Promise.resolve()
      const entry = files.get(file)
      if (!entry) return err('missing')
      if (rev(entry.revision) !== expected) return err('stale')
      const applied = applyOutlineEdit(entry.outline, edit)
      if (!applied.ok) return applied
      const previous = JSON.stringify(entry.outline)
      files.set(file, { outline: applied.value, revision: entry.revision + 1 })
      writes++
      return ok({ document: doc(file), previous })
    },
    async restoreOutline(_root, file, text, expected) {
      const entry = files.get(file)
      if (!entry) return err('missing')
      if (rev(entry.revision) !== expected) return err('stale')
      files.set(file, { outline: JSON.parse(text) as Outline, revision: entry.revision + 1 })
      return ok(doc(file))
    },
  }
  const elsewhere = (file: string, outline: Outline): void => {
    const entry = files.get(file)
    files.set(file, { outline, revision: (entry?.revision ?? 0) + 1 })
  }
  return { repository, files, elsewhere, writes: () => writes }
}

function setup(root: string | null = '/books/orchard') {
  const memory = memoryRepository()
  const session = createOutlineSession({ repository: memory.repository, root: () => root })
  const events: OutlineEvent[] = []
  session.onEvent((event) => events.push(event))
  return { ...memory, session, events }
}

const cards = (outline: Outline | undefined) => outline?.sections.map((section) => section.items.map((item) => item.text))

describe('outline session', () => {
  it('opens an outline and applies edits, each from the revision the last one left', async () => {
    const { session } = setup()
    await session.open(MAIN)
    await session.edit(MAIN, { kind: 'move-item', from: { section: 0, path: [1] }, to: { section: 1, parentPath: [], index: 0 } })
    const second = await session.edit(MAIN, { kind: 'add-item', to: { section: 0, parentPath: [], index: 1 }, text: 'Bea waits' })
    expect(second.ok && cards(second.value.outline)).toEqual([
      ['Ilka arrives', 'Bea waits'],
      ['The first frost', 'The sale'],
    ])
  })

  it('runs quick edits one at a time, so none starts from an outdated outline', async () => {
    const { session, writes } = setup()
    await session.open(MAIN)
    const results = await Promise.all([
      session.edit(MAIN, { kind: 'add-item', to: { section: 0, parentPath: [], index: 0 }, text: 'one' }),
      session.edit(MAIN, { kind: 'add-item', to: { section: 0, parentPath: [], index: 0 }, text: 'two' }),
      session.edit(MAIN, { kind: 'add-item', to: { section: 0, parentPath: [], index: 0 }, text: 'three' }),
    ])
    expect(results.every((result) => result.ok)).toBe(true)
    expect(writes()).toBe(3)
    expect(
      session
        .current(MAIN)
        ?.outline.sections[0]?.items.map((i) => i.text)
        .slice(0, 3),
    ).toEqual(['three', 'two', 'one'])
  })

  it('checks the outline rules before writing anything', async () => {
    const { session, writes } = setup()
    await session.open(MAIN)
    expect(
      await session.edit(MAIN, { kind: 'move-item', from: { section: 0, path: [0] }, to: { section: 0, parentPath: [0], index: 0 } }),
    ).toEqual({
      ok: false,
      error: 'into-own-subtree',
    })
    expect(writes()).toBe(0)
  })

  it('refuses an edit planned on an outline changed elsewhere, and shows the new version', async () => {
    const { session, elsewhere, events, files } = setup()
    await session.open(MAIN)
    elsewhere(MAIN, {
      title: 'Main story',
      preamble: [],
      sections: [{ name: 'Rewritten', intro: [], notes: [], lineUp: null, items: [card('Only this')] }],
    })
    expect(await session.edit(MAIN, { kind: 'delete-item', at: { section: 0, path: [0] } })).toEqual({
      ok: false,
      error: 'changed-elsewhere',
    })
    expect(cards(files.get(MAIN)?.outline)).toEqual([['Only this']])
    expect(events.at(-1)).toMatchObject({
      kind: 'outline-changed',
      file: MAIN,
      document: { outline: { sections: [{ name: 'Rewritten' }] } },
    })
  })

  it('undoes edits in reverse order, back to the opened outline', async () => {
    const { session, files } = setup()
    await session.open(MAIN)
    await session.edit(MAIN, { kind: 'rename-item', at: { section: 0, path: [0] }, text: 'Ilka arrives late' })
    await session.edit(MAIN, { kind: 'delete-section', section: 1 })
    expect(session.current(MAIN)?.canUndo).toBe(true)
    await session.undo(MAIN)
    const back = await session.undo(MAIN)
    expect(back.ok && back.value.canUndo).toBe(false)
    expect(files.get(MAIN)?.outline).toEqual(story())
    expect(await session.undo(MAIN)).toEqual({ ok: false, error: 'nothing-to-undo' })
  })

  it('refuses to undo over a change made elsewhere, and says so', async () => {
    const { session, elsewhere, files } = setup()
    await session.open(MAIN)
    await session.edit(MAIN, { kind: 'delete-item', at: { section: 0, path: [0] } })
    const theirs: Outline = { title: 'Theirs', preamble: [], sections: [] }
    elsewhere(MAIN, theirs)
    expect(await session.undo(MAIN)).toEqual({ ok: false, error: 'changed-elsewhere' })
    expect(files.get(MAIN)?.outline).toEqual(theirs)
    expect(session.current(MAIN)?.canUndo).toBe(false)
  })

  it('opening an outline changed since its last edit (in the Text view) offers no undo, and keeps undo otherwise', async () => {
    const { session, elsewhere } = setup()
    await session.open(MAIN)
    await session.edit(MAIN, { kind: 'set-title', text: 'Mine' })
    expect((await session.open(MAIN)).ok && session.current(MAIN)?.canUndo).toBe(true)
    elsewhere(MAIN, { title: 'Typed as text', preamble: [], sections: [] })
    const reopened = await session.open(MAIN)
    expect(reopened.ok && reopened.value).toMatchObject({ canUndo: false, outline: { title: 'Typed as text' } })
  })

  it('reloads an open outline changed elsewhere, but not after its own edits', async () => {
    const { session, elsewhere, events } = setup()
    await session.open(MAIN)
    await session.edit(MAIN, { kind: 'set-title', text: 'Mine' })
    await session.fileChanged(MAIN)
    expect(events.filter((e) => e.kind === 'outline-changed')).toHaveLength(0)
    elsewhere(MAIN, { title: 'Theirs', preamble: [], sections: [] })
    await session.fileChanged(MAIN)
    expect(events.at(-1)).toMatchObject({ kind: 'outline-changed', document: { outline: { title: 'Theirs' } } })
  })

  it('creates outlines and lists them', async () => {
    const { session } = setup()
    const created = await session.create('Character arcs')
    expect(created.ok && created.value.file).toBe('outlines/character-arcs.md')
    expect((await session.list()).map((o) => o.title)).toEqual(['Main story', 'Character arcs'])
  })

  it('forgets undo history when another project opens', async () => {
    const { session } = setup()
    await session.open(MAIN)
    await session.edit(MAIN, { kind: 'set-title', text: 'Mine' })
    session.reset()
    expect(session.current(MAIN)).toBeNull()
  })

  it('needs an open project', async () => {
    const { session } = setup(null)
    expect(await session.open(MAIN)).toEqual({ ok: false, error: 'no-project' })
  })
})

describe('line-ups between outlines (ADR 0012)', () => {
  const BEA = p('outlines/beas-path.md')
  const ending = { outline: MAIN, anchor: 'ending', text: 'Ending' }
  const beasPath = (): Outline => ({
    title: 'Bea’s path',
    preamble: [],
    sections: [
      { name: 'Hiding', intro: [], notes: [], lineUp: ending, items: [card('Hides the letter')] },
      { name: 'The city', intro: [], notes: [], lineUp: { outline: MAIN, anchor: 'beginning', text: 'Beginning' }, items: [] },
    ],
  })
  function withBea() {
    const context = setup()
    context.files.set(BEA, { outline: beasPath(), revision: 1 })
    return context
  }

  it('refuses lining a section up with its own outline', async () => {
    const { session } = withBea()
    await session.open(BEA)
    const own = { kind: 'line-up-section', section: 0, lineUp: { outline: BEA, anchor: 'the-city', text: 'The city' }, words: '' } as const
    expect(await session.edit(BEA, own)).toEqual({ ok: false, error: 'same-outline' })
  })

  it('renaming a section updates the line-ups that point to it, in other outlines, and only those', async () => {
    const { session, files, events } = withBea()
    await session.open(MAIN)
    await session.open(BEA)
    await session.edit(MAIN, { kind: 'rename-section', section: 1, text: 'The sale' })
    expect(files.get(BEA)?.outline.sections.map((s) => s.lineUp)).toEqual([
      { outline: MAIN, anchor: 'the-sale', text: 'The sale' },
      { outline: MAIN, anchor: 'beginning', text: 'Beginning' },
    ])
    expect(session.current(BEA)?.outline.sections[0]?.lineUp?.anchor).toBe('the-sale')
    expect(events.at(-1)).toMatchObject({ kind: 'outline-changed', file: BEA })
  })

  it('undoing the rename points them back', async () => {
    const { session, files } = withBea()
    await session.open(MAIN)
    await session.edit(MAIN, { kind: 'rename-section', section: 1, text: 'The sale' })
    await session.undo(MAIN)
    expect(files.get(BEA)?.outline.sections[0]?.lineUp).toEqual({ outline: MAIN, anchor: 'ending', text: 'Ending' })
  })

  it('other edits leave the other outlines alone', async () => {
    const { session, files } = withBea()
    await session.open(MAIN)
    await session.edit(MAIN, { kind: 'move-section', section: 1, index: 0 })
    await session.edit(MAIN, { kind: 'add-section', index: 0, text: 'Prologue' })
    expect(files.get(BEA)?.revision).toBe(1)
  })
})

describe('the timeline’s storylines (ADR 0012)', () => {
  const BEA = p('outlines/beas-path.md')
  it('reads every outline, the main one first, with line-ups resolved to sections or missing', async () => {
    const { session, files } = setup()
    files.set(BEA, {
      outline: {
        title: 'Bea’s path',
        preamble: [],
        sections: [
          { name: 'Hiding', intro: [], notes: [], lineUp: { outline: MAIN, anchor: 'Ending', text: 'Ending' }, items: [] },
          { name: 'Lost', intro: [], notes: [], lineUp: { outline: MAIN, anchor: 'the-flood', text: 'The flood' }, items: [] },
          { name: 'Gone', intro: [], notes: [], lineUp: { outline: p('outlines/deleted.md'), anchor: 'x', text: 'X' }, items: [] },
        ],
      },
      revision: 1,
    })
    const timeline = await session.timeline(BEA)
    expect(timeline.ok && timeline.value.main).toBe(BEA)
    expect(timeline.ok && timeline.value.threads.map((thread) => thread.file)).toEqual([BEA, MAIN])
    expect(timeline.ok && timeline.value.threads[0]?.sections.map((section) => section.lineUp)).toEqual([
      { kind: 'section', outline: MAIN, section: 1, text: 'Ending' },
      { kind: 'missing', outline: MAIN, anchor: 'the-flood', text: 'The flood' },
      { kind: 'missing', outline: 'outlines/deleted.md', anchor: 'x', text: 'X' },
    ])
    const unnamed = await session.timeline(null)
    expect(unnamed.ok && unnamed.value.main).toBe(MAIN)
    expect(await setup(null).session.timeline(null)).toEqual({ ok: false, error: 'no-project' })
  })
})
