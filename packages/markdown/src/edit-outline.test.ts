import { describe, expect, it } from 'vitest'
import { assertSafeBoundary, editOutline } from './edit-outline'
import type { ItemDestination, OutlineEdit } from './outline-model'
import {
  allItems,
  applyToShape,
  fixture,
  fixtureNames,
  keptTexts,
  keptTextsInside,
  moveIsLocal,
  nonBlankLines,
  shapeOf,
  withoutIds,
} from './outline.test-support'
import { readOutline } from './read-outline'

function apply(source: string, edit: OutlineEdit, nestingUnit?: string): string {
  const result = editOutline(source, edit, nestingUnit ? { nestingUnit } : {})
  if (!result.ok) throw new Error(`refused ${edit.kind}: ${result.error}`)
  return result.value
}

const refusal = (source: string, edit: OutlineEdit): string | null => {
  const result = editOutline(source, edit)
  return result.ok ? null : result.error
}

/** Commutation: reading the edited text gives the shape the edit predicts. */
function expectCommutes(before: string, edit: OutlineEdit, after: string): void {
  expect(withoutIds(shapeOf(readOutline(after)))).toEqual(withoutIds(applyToShape(shapeOf(readOutline(before)), edit)))
}

const basic = fixture('basic-en.md')

describe('examples, exact output', () => {
  it('moves a card with its details to another section', () => {
    const after = apply(basic, { kind: 'move-item', from: { section: 0, path: [1] }, to: { section: 2, parentPath: [], index: 0 } })
    expect(after).toBe(
      basic
        .replace('- The first frost\n  - Noël arrives with the wrong keys\n', '')
        .replace('## Ending\n\n', '## Ending\n\n- The first frost\n  - Noël arrives with the wrong keys\n'),
    )
  })

  it('moves a card to the end of its own section', () => {
    const after = apply(basic, { kind: 'move-item', from: { section: 1, path: [0] }, to: { section: 1, parentPath: [], index: 1 } })
    expect(after).toContain(
      '## Middle\n\n- Ilka finds the ledger\n- The trees bear salt instead of fruit\n  - Nobody in Marrow will say why\n\n## Ending',
    )
  })

  it('moves the only card into an empty section, leaving its old section empty', () => {
    const after = apply(fixture('empty-sections.md'), {
      kind: 'move-item',
      from: { section: 1, path: [0] },
      to: { section: 0, parentPath: [], index: 0 },
    })
    expect(after).toBe('# Outline\n\n## Beginning\n\n- The only card\n\n## Middle\n\n## Ending\n')
  })

  it('moves a card into the last, empty section at the end of the file', () => {
    const after = apply(fixture('empty-sections.md'), {
      kind: 'move-item',
      from: { section: 1, path: [0] },
      to: { section: 2, parentPath: [], index: 0 },
    })
    expect(after).toBe('# Outline\n\n## Beginning\n\n## Middle\n\n## Ending\n\n- The only card\n')
  })

  it('turns a detail into a card and re-indents its own details, keeping tabs', () => {
    const after = apply(fixture('indent-tabs.md'), {
      kind: 'move-item',
      from: { section: 0, path: [0, 0] },
      to: { section: 1, parentPath: [], index: 1 },
    })
    expect(after).toContain('- The orchard is sold\n\t- Noël signs as witness\n- With one suitcase\n\t- It belonged to her mother\n')
  })

  it('renames a card, writing its inline formatting as typed', () => {
    expect(apply(basic, { kind: 'rename-item', at: { section: 0, path: [0] }, text: 'Ilka *inherits* the **orchard**' })).toBe(
      basic.replace('- Ilka inherits the orchard', '- Ilka *inherits* the **orchard**'),
    )
  })

  it('keeps a task checkbox when renaming', () => {
    expect(
      apply(fixture('ordered-and-task-lists.md'), { kind: 'rename-item', at: { section: 1, path: [1] }, text: 'Name every living tree' }),
    ).toContain('- [x] Name every living tree\n')
  })

  it('escapes text that would otherwise become Markdown structure', () => {
    expect(apply(basic, { kind: 'rename-item', at: { section: 2, path: [0] }, text: '# not a heading' })).toContain('- \\# not a heading\n')
  })

  it('adds a card, a first detail and a section', () => {
    let after = apply(basic, { kind: 'add-item', to: { section: 1, parentPath: [], index: 2 }, text: 'Bea burns the ledger' })
    after = apply(after, { kind: 'add-item', to: { section: 1, parentPath: [1], index: 0 }, text: 'Under the loose floorboard' })
    after = apply(after, { kind: 'add-section', index: 3, text: 'Epilogue' })
    expect(after).toBe(
      basic
        .replace('- Ilka finds the ledger\n', '- Ilka finds the ledger\n  - Under the loose floorboard\n- Bea burns the ledger\n')
        .concat('\n## Epilogue\n'),
    )
  })

  it('renames a section and keeps closing hashes', () => {
    expect(apply('## Old name ##\n\n- card\n', { kind: 'rename-section', section: 0, text: 'New name' })).toBe('## New name ##\n\n- card\n')
  })

  it('deletes a card with its details', () => {
    const after = apply(basic, { kind: 'delete-item', at: { section: 0, path: [0] } })
    expect(after).toBe(
      basic.replace('- Ilka inherits the orchard\n  - The will names Marrow, not her brother\n  - Aunt Bea refuses to sign\n', ''),
    )
  })

  it('removes a card from a loose list together with one blank-line separator', () => {
    expect(apply(fixture('loose-lists.md'), { kind: 'delete-item', at: { section: 0, path: [1] } })).toContain(
      '- Ilka arrives in Marrow\n\n- Noël brings bolt cutters\n',
    )
  })

  it('regression: removing a nested item numbered 1 renumbers the next, so it stays a list (finding 6)', () => {
    const after = apply('## Plan\n\n- Bea objects\n  1. First reason\n  2. Second reason\n', {
      kind: 'delete-item',
      at: { section: 0, path: [0, 0] },
    })
    expect(after).toBe('## Plan\n\n- Bea objects\n  1. Second reason\n')
    expect(readOutline(after).sections[0]?.items[0]?.children.map((c) => c.text)).toEqual(['Second reason'])
  })

  it('regression: nests with the remembered indentation when the file shows none (finding 7)', () => {
    const source = '## Beginning\n\n- Ilka arrives\n- With one suitcase\n'
    const edit: OutlineEdit = { kind: 'move-item', from: { section: 0, path: [1] }, to: { section: 0, parentPath: [0], index: 0 } }
    expect(apply(source, edit, '\t')).toBe('## Beginning\n\n- Ilka arrives\n\t- With one suitcase\n')
    expect(apply(source, edit)).toBe('## Beginning\n\n- Ilka arrives\n  - With one suitcase\n')
  })

  it('keeps a numbered list numbered when a bullet card moves into it', () => {
    expect(
      apply(fixture('ordered-and-task-lists.md'), {
        kind: 'move-item',
        from: { section: 1, path: [0] },
        to: { section: 0, parentPath: [], index: 3 },
      }),
    ).toContain('3. The sale\n4. [ ] Map the orchard rows\n')
  })

  it('keeps Windows line endings in every line it writes', () => {
    let after = apply(fixture('crlf.md'), { kind: 'add-item', to: { section: 0, parentPath: [0], index: 0 }, text: 'A new detail' })
    after = apply(after, { kind: 'add-section', index: 3, text: 'Epilogue' })
    after = apply(after, { kind: 'move-section', section: 3, index: 0 })
    expect(after.replace(/\r\n/g, '')).not.toContain('\n')
  })
})

describe('reusing an outline already read', () => {
  it('gives the same result, and is ignored when it was read from different text', () => {
    const edit: OutlineEdit = { kind: 'move-item', from: { section: 0, path: [1] }, to: { section: 2, parentPath: [], index: 0 } }
    const expected = apply(basic, edit)
    expect(editOutline(basic, edit, { parsed: readOutline(basic) })).toEqual({ ok: true, value: expected })
    expect(editOutline(basic, edit, { parsed: readOutline(fixture('basic-he.md')) })).toEqual({ ok: true, value: expected })
  })
})

describe('the outline title', () => {
  it('renames the title', () => {
    expect(apply(basic, { kind: 'set-title', text: 'מטע המלח' })).toBe(basic.replace('# The Salt Orchard', '# מטע המלח'))
  })

  it('adds a title after the frontmatter when there is none', () => {
    expect(apply('---\nauthor: Ines\n---\n## Beginning\n\n- card\n', { kind: 'set-title', text: 'Main story' })).toBe(
      '---\nauthor: Ines\n---\n# Main story\n\n## Beginning\n\n- card\n',
    )
    expect(apply('', { kind: 'set-title', text: 'Main story' })).toBe('# Main story\n')
  })
})

describe('sections: moving and deleting', () => {
  it('moves a section with everything in it, as a block', () => {
    const after = apply(basic, { kind: 'move-section', section: 2, index: 0 })
    expect(after).toBe(
      '# The Salt Orchard\n\n## Ending\n\n- The orchard is sold\n\n' +
        basic.slice(basic.indexOf('## Beginning'), basic.indexOf('## Ending')).replace(/\n+$/, '\n'),
    )
  })

  it('moves a section to the end', () => {
    const after = apply(basic, { kind: 'move-section', section: 0, index: 2 })
    expect(shapeOf(readOutline(after)).sections.map((s) => s.heading)).toEqual(['Middle', 'Ending', 'Beginning'])
    expect(after.endsWith('- The first frost\n  - Noël arrives with the wrong keys\n')).toBe(true)
  })

  it('deletes a section with its cards, and the last one without leaving a gap', () => {
    expect(apply(basic, { kind: 'delete-section', section: 1 })).not.toContain('## Middle')
    const after = apply(basic, { kind: 'delete-section', section: 2 })
    expect(after.endsWith('- Ilka finds the ledger\n')).toBe(true)
  })

  it('moves kept-as-written content with its section, never losing it', () => {
    const source = fixture('embedded-blocks.md')
    const after = apply(apply(source, { kind: 'add-section', index: 0, text: 'First' }), { kind: 'move-section', section: 1, index: 0 })
    expect(keptTexts(readOutline(after))).toEqual(keptTexts(readOutline(source)))
  })
})

/** Every destination for an item: each top-level position in each section, and first child of every other item. */
function destinationsFor(outline: ReturnType<typeof readOutline>, from: { section: number; path: number[] }): ItemDestination[] {
  const destinations: ItemDestination[] = []
  for (const [section, { items }] of outline.sections.entries()) {
    const count = items.length - (section === from.section && from.path.length === 1 ? 1 : 0)
    for (let index = 0; index <= count; index++) destinations.push({ section, parentPath: [], index })
  }
  for (const { section, path } of allItems(outline)) {
    const isSelfOrInside = section === from.section && from.path.every((v, i) => path[i] === v)
    if (!isSelfOrInside) destinations.push({ section, parentPath: path, index: 0 })
  }
  return destinations
}

describe.each(fixtureNames)('every edit on %s', (name) => {
  const source = fixture(name)
  const outline = readOutline(source)

  // Thousands of moves: a check of correctness, not speed, so a busy machine mustn't fail it (5 s by default).
  it('every move matches the model, is local, and keeps what is kept as written', () => {
    let checked = 0
    for (const { item, section, path } of allItems(outline)) {
      if (!item.movable) continue
      for (const to of destinationsFor(outline, { section, path })) {
        const edit: OutlineEdit = { kind: 'move-item', from: { section, path }, to }
        const after = apply(source, edit)
        expectCommutes(source, edit, after)
        expect(moveIsLocal(source, item, after), `${JSON.stringify(edit)}\n--- after\n${after}`).toBe(true)
        expect(keptTexts(readOutline(after))).toEqual(keptTexts(outline))
        checked++
      }
    }
    expect(checked).toBeGreaterThan(0)
  }, 60_000)

  it('reading a moved outline again, with its unchanged sections remembered, gives exactly what a fresh read gives', () => {
    const first = allItems(outline).find(({ item }) => item.movable)
    if (!first) return
    readOutline(source)
    for (const to of destinationsFor(outline, first)) {
      const after = apply(source, { kind: 'move-item', from: { section: first.section, path: first.path }, to })
      expect(readOutline(after)).toEqual(readOutline(after, { fresh: true }))
    }
  })

  it('every rename changes only that text', () => {
    for (const { item, section, path } of allItems(outline)) {
      const edit: OutlineEdit = { kind: 'rename-item', at: { section, path }, text: 'Renamed — שונה 🍐' }
      const after = apply(source, edit)
      expectCommutes(source, edit, after)
      expect(after).toBe(source.slice(0, item.textRange.start) + 'Renamed — שונה 🍐' + source.slice(item.textRange.end))
    }
  })

  it('every delete removes exactly that card and what is inside it', () => {
    for (const { item, section, path } of allItems(outline)) {
      if (!item.movable) continue
      const edit: OutlineEdit = { kind: 'delete-item', at: { section, path } }
      const after = apply(source, edit)
      expectCommutes(source, edit, after)
      const expected = keptTexts(outline)
      for (const text of keptTextsInside(source, item)) expected.splice(expected.indexOf(text), 1)
      expect(keptTexts(readOutline(after))).toEqual(expected)
      expect(nonBlankLines(after)).toEqual(nonBlankLines(source.slice(0, item.lineRange.start) + source.slice(item.lineRange.end)))
    }
  })

  it('adding a card anywhere adds exactly one line', () => {
    for (const [section, { items }] of outline.sections.entries()) {
      for (let index = 0; index <= items.length; index++) {
        const edit: OutlineEdit = { kind: 'add-item', to: { section, parentPath: [], index }, text: 'New card' }
        const after = apply(source, edit)
        expectCommutes(source, edit, after)
        expect(keptTexts(readOutline(after))).toEqual(keptTexts(outline))
        expect(nonBlankLines(after).length - nonBlankLines(source).length).toBe(1)
      }
    }
  })

  it('adding, renaming, moving and deleting sections match the model and keep the rest', () => {
    const sectionEdits: OutlineEdit[] = []
    for (let index = 0; index <= outline.sections.length; index++) sectionEdits.push({ kind: 'add-section', index, text: 'New section' })
    for (const [section, { heading }] of outline.sections.entries()) {
      if (!heading) continue
      sectionEdits.push({ kind: 'rename-section', section, text: 'Renamed section' })
      for (let index = 0; index < outline.sections.length; index++) sectionEdits.push({ kind: 'move-section', section, index })
    }
    for (const edit of sectionEdits) {
      const result = editOutline(source, edit)
      if (!result.ok) {
        expect(result.error).toBe('unnamed-section')
        continue
      }
      expectCommutes(source, edit, result.value)
      expect(keptTexts(readOutline(result.value))).toEqual(keptTexts(outline))
    }
  })
})

describe('edits that cannot be applied safely are refused, and write nothing', () => {
  it('an item that shares its line with other syntax', () => {
    const source = '## S\n\n- - nested on one line\n'
    expect(refusal(source, { kind: 'move-item', from: { section: 0, path: [0, 0] }, to: { section: 0, parentPath: [], index: 0 } })).toBe(
      'unmovable-item',
    )
    expect(readOutline(source).warnings.map((w) => w.code)).toContain('unmovable-item')
  })

  it('moving an item inside itself', () => {
    expect(refusal(basic, { kind: 'move-item', from: { section: 0, path: [0] }, to: { section: 0, parentPath: [0], index: 0 } })).toBe(
      'into-own-subtree',
    )
  })

  it('naming, moving or deleting the unnamed section, or putting a section above it', () => {
    const source = fixture('preamble-and-h3.md')
    expect(refusal(source, { kind: 'rename-section', section: 0, text: 'x' })).toBe('unnamed-section')
    expect(refusal(source, { kind: 'add-section', index: 0, text: 'x' })).toBe('unnamed-section')
    expect(refusal(source, { kind: 'move-section', section: 0, index: 1 })).toBe('unnamed-section')
    expect(refusal(source, { kind: 'move-section', section: 2, index: 0 })).toBe('unnamed-section')
    expect(refusal(source, { kind: 'delete-section', section: 0 })).toBe('unnamed-section')
  })

  it('multi-line text, missing items and impossible positions', () => {
    expect(refusal(basic, { kind: 'rename-item', at: { section: 0, path: [0] }, text: 'two\nlines' })).toBe('multiline-text')
    expect(refusal(basic, { kind: 'set-title', text: 'two\nlines' })).toBe('multiline-text')
    expect(refusal(basic, { kind: 'rename-item', at: { section: 0, path: [9] }, text: 'x' })).toBe('no-such-item')
    expect(refusal(basic, { kind: 'move-item', from: { section: 0, path: [0] }, to: { section: 0, parentPath: [], index: 5 } })).toBe(
      'index-out-of-range',
    )
    expect(refusal(basic, { kind: 'add-item', to: { section: 7, parentPath: [], index: 0 }, text: 'x' })).toBe('no-such-section')
    expect(refusal(basic, { kind: 'move-section', section: 0, index: 3 })).toBe('index-out-of-range')
  })

  it('renaming a heading written over two lines', () => {
    expect(refusal('Two line\nheading\n---\n\n- card\n', { kind: 'rename-section', section: 0, text: 'x' })).toBe('multiline-heading')
  })
})

describe('frontmatter is never touched by outline edits', () => {
  it.each(['frontmatter.md', 'frontmatter-invalid.md'])('%s', (name) => {
    const source = fixture(name)
    const frontmatter = source.slice(0, readOutline(source).frontmatter?.range.end)
    let after = apply(source, { kind: 'add-section', index: 0, text: 'Prologue' })
    after = apply(after, { kind: 'rename-item', at: { section: 1, path: [0] }, text: 'Ilka arrives late' })
    expect(after.startsWith(frontmatter)).toBe(true)
  })
})

describe('links and Unicode in cards', () => {
  it.each(['[The Crossing](../manuscript/the-crossing.md)', '[[the-crossing]]', '[The Crossing](plotdevice:ch-k3f9)'])(
    '%s survives moves and neighbouring renames',
    (link) => {
      const source = `## Beginning\n\n- Ilka arrives, see ${link}\n- Bea waits\n\n## Ending\n\n- The sale\n`
      let after = apply(source, { kind: 'move-item', from: { section: 0, path: [0] }, to: { section: 1, parentPath: [], index: 1 } })
      after = apply(after, { kind: 'rename-item', at: { section: 1, path: [0] }, text: 'The quiet sale' })
      expect(after).toContain(`- Ilka arrives, see ${link}\n`)
    },
  )

  it('slices emoji, joined emoji, flags and niqqud exactly (UTF-16 offsets)', () => {
    const unicode = fixture('unicode-niqqud-emoji.md')
    const writtenTexts = unicode.split('\n').flatMap((line) => /^[ \t]*- (.*?)\r?$/.exec(line)?.slice(1) ?? [])
    expect(allItems(readOutline(unicode)).map(({ item }) => unicode.slice(item.textRange.start, item.textRange.end))).toEqual(writtenTexts)
    expect(writtenTexts.some((text) => /\p{Extended_Pictographic}/u.test(text)) && writtenTexts.some((text) => /\p{M}/u.test(text))).toBe(
      true,
    )
  })

  it('keeps a decomposed (NFD) line decomposed through unrelated edits', () => {
    const decomposed = 'Noe\u0308l tastes it'
    expect(fixture('unicode-niqqud-emoji.md')).toContain(decomposed)
    const after = apply(fixture('unicode-niqqud-emoji.md'), {
      kind: 'move-item',
      from: { section: 0, path: [0] },
      to: { section: 1, parentPath: [], index: 1 },
    })
    expect(after).toContain(decomposed)
    expect(after).not.toContain('No\u00ebl tastes it')
  })

  it('refuses, as a bug, any splice that would split an emoji or detach niqqud', () => {
    expect(() => assertSafeBoundary('a🍐b', 2)).toThrow(/surrogate/)
    expect(() => assertSafeBoundary('a🍐b', 1)).not.toThrow()
    expect(() => assertSafeBoundary('שָׁ', 1)).toThrow(/combining/)
  })
})
