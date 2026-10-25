import { describe, expect, it } from 'vitest'
import { editOutline } from './edit-outline'
import { allItems, fixture, fixtureNames, shapeOf } from './outline.test-support'
import { readOutline } from './read-outline'

describe('reading an outline (ADR 0003)', () => {
  it('maps ## headings to sections, top-level items to cards and nested items to details', () => {
    expect(shapeOf(readOutline(fixture('basic-en.md')))).toEqual({
      title: 'The Salt Orchard',
      sections: [
        {
          heading: 'Beginning',
          items: [
            {
              text: 'Ilka inherits the orchard',
              children: [
                { text: 'The will names Marrow, not her brother', children: [] },
                { text: 'Aunt Bea refuses to sign', children: [] },
              ],
            },
            { text: 'The first frost', children: [{ text: 'Noël arrives with the wrong keys', children: [] }] },
          ],
        },
        {
          heading: 'Middle',
          items: [
            { text: 'The trees bear salt instead of fruit', children: [{ text: 'Nobody in Marrow will say why', children: [] }] },
            { text: 'Ilka finds the ledger', children: [] },
          ],
        },
        { heading: 'Ending', items: [{ text: 'The orchard is sold', children: [] }] },
      ],
    })
  })

  it('reads a Hebrew outline the same way', () => {
    const shape = shapeOf(readOutline(fixture('basic-he.md')))
    expect(shape.sections.length).toBeGreaterThan(1)
    expect(shape.sections.every((section) => section.heading && /[֐-׿]/.test(section.heading))).toBe(true)
  })

  it('treats frontmatter as frontmatter, not as a section', () => {
    const outline = readOutline(fixture('frontmatter.md'))
    expect(outline.frontmatter?.valid).toBe(true)
    expect(outline.title?.text).toBe('Main story')
    expect(outline.sections.map((s) => s.heading?.text)).toEqual(['Beginning'])
  })

  it('warns about invalid frontmatter and still reads the outline', () => {
    const outline = readOutline(fixture('frontmatter-invalid.md'))
    expect(outline.frontmatter?.valid).toBe(false)
    expect(outline.warnings.map((w) => w.code)).toContain('invalid-frontmatter')
    expect(shapeOf(outline).sections[0]?.items.map((i) => i.text)).toEqual(['Ilka arrives'])
  })

  it('puts cards before the first ## in an unnamed section, and keeps ### headings as written', () => {
    const outline = readOutline(fixture('preamble-and-h3.md'))
    expect(shapeOf(outline).sections.map((s) => [s.heading, s.items.map((i) => i.text)])).toEqual([
      [null, ['A loose idea before the first section']],
      ['Act one', ['Ilka arrives', 'The frost']],
      ['Act two', ['The ledger']],
    ])
    expect(outline.warnings.filter((w) => w.code === 'subheading')).toHaveLength(2)
  })

  it("keeps prose between a heading and its first card as the section's intro", () => {
    const outline = readOutline(fixture('section-intro-paragraphs.md'))
    expect(outline.sections.map((s) => s.intro.length)).toEqual([1, 1])
    expect(outline.warnings).toEqual([])
  })

  it('reads every bullet marker; a different marker starts a new list in the same section', () => {
    expect(shapeOf(readOutline(fixture('mixed-markers.md'))).sections[0]?.items.map((i) => [i.text, i.children.length])).toEqual([
      ['Dash item', 2],
      ['Star item, which starts a new list', 0],
      ['Plus item, which starts another', 0],
    ])
  })

  it('reads numbered and task lists, keeping the checkbox out of the card text', () => {
    const outline = readOutline(fixture('ordered-and-task-lists.md'))
    expect(outline.sections[1]?.items.map((i) => [i.text, i.checked])).toEqual([
      ['Map the orchard rows', false],
      ['Name every tree', true],
    ])
    expect(outline.sections[0]?.items.map((i) => i.marker)).toEqual([
      { kind: 'ordered', number: 1, delimiter: '.' },
      { kind: 'ordered', number: 2, delimiter: '.' },
      { kind: 'ordered', number: 3, delimiter: '.' },
    ])
  })

  it('reports what it keeps as written: inside cards, and between them', () => {
    const outline = readOutline(fixture('embedded-blocks.md'))
    expect(outline.sections[0]?.items.map((i) => i.kept.map((b) => b.type))).toEqual([['code'], ['table'], ['blockquote'], []])
    expect(outline.sections[0]?.kept.map((b) => b.type)).toEqual(['html', 'table'])
  })

  it('reads six levels of nesting', () => {
    let depth = 0
    let items = shapeOf(readOutline(fixture('deep-nesting.md'))).sections[0]?.items ?? []
    while (items[0]) {
      depth++
      items = items[0].children
    }
    expect(depth).toBe(6)
  })

  it('a list inside a quote is not a card', () => {
    const outline = readOutline('## Notes\n\n> - quoted idea\n\n- real card\n')
    expect(shapeOf(outline).sections[0]?.items.map((i) => i.text)).toEqual(['real card'])
    expect(outline.sections[0]?.kept.map((b) => b.type)).toEqual(['blockquote'])
  })
})

describe('reading one section at a time (for speed) agrees with reading the whole file', () => {
  const comparable = (outline: ReturnType<typeof readOutline>) => JSON.stringify({ ...outline, source: undefined })

  it.each(fixtureNames)('%s', (name) => {
    expect(comparable(readOutline(fixture(name)))).toBe(comparable(readOutline(fixture(name), { wholeDocument: true })))
  })

  it("doesn't split at a ## line inside fenced code or an HTML comment", () => {
    const source = '## Real\n\n- card\n\n```\n## not a section\n```\n\n<!--\n## not a section either\n-->\n\n- second card\n'
    expect(readOutline(source).sections.map((s) => s.heading?.text)).toEqual(['Real'])
    expect(comparable(readOutline(source))).toBe(comparable(readOutline(source, { wholeDocument: true })))
  })

  it("regression: doesn't split at a ## line inside an HTML block (Spike A's open limit)", () => {
    const source = '## Real\n\n- card\n\n<div>\n## inside the div, so not a section\n</div>\n'
    expect(comparable(readOutline(source))).toBe(comparable(readOutline(source, { wholeDocument: true })))
    expect(readOutline(source).sections.map((s) => s.heading?.text)).toEqual(['Real'])
  })
})

describe('no-op edits write nothing', () => {
  it.each(fixtureNames)('%s: renaming every card to its own text changes nothing', (name) => {
    const source = fixture(name)
    for (const { item, section, path } of allItems(readOutline(source))) {
      if (item.text.includes('\n')) continue // renaming collapses a multi-line card to one line, by design
      expect(editOutline(source, { kind: 'rename-item', at: { section, path }, text: item.text })).toEqual({ ok: true, value: source })
    }
  })

  it.each(fixtureNames)('%s: moving every card to where it already is changes nothing', (name) => {
    const source = fixture(name)
    for (const { item, section, path } of allItems(readOutline(source))) {
      if (!item.movable) continue
      const to = { section, parentPath: path.slice(0, -1), index: path.at(-1) ?? 0 }
      expect(editOutline(source, { kind: 'move-item', from: { section, path }, to })).toEqual({ ok: true, value: source })
    }
  })

  it.each(fixtureNames)('%s: moving every section to where it already is changes nothing', (name) => {
    const source = fixture(name)
    for (const section of readOutline(source).sections.keys()) {
      const result = editOutline(source, { kind: 'move-section', section, index: section })
      expect(result.ok ? result.value : source).toBe(source)
    }
  })
})
