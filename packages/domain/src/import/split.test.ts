import { describe, expect, it } from 'vitest'
import { chapterLine } from './chapter-lines'
import { chooseSplit, splitManuscript, type ManuscriptParagraph } from './split'

const p = (text: string, more: Partial<ManuscriptParagraph> = {}): ManuscriptParagraph => ({
  text,
  heading: 0,
  title: false,
  pageBreakBefore: false,
  ...more,
})
const h = (level: number, text: string, more: Partial<ManuscriptParagraph> = {}) => p(text, { heading: level, ...more })

/** A Hebrew manuscript with Word's heading styles: a title page, two parts, three chapters. */
const hebrew: ManuscriptParagraph[] = [
  p('מטע המלח', { title: true }), // 0
  p('מאת אינס ורגה'), // 1
  h(1, 'חלק ראשון: הגעה', { pageBreakBefore: true }), // 2
  h(2, 'פרק 1: המעבר'), // 3
  p('המעבורת יצאה לפני עלות השחר.'), // 4
  p('* * *'), // 5
  p('היא לא חיכתה לצהריים.'), // 6
  h(2, 'פרק 2: שער המטע', { pageBreakBefore: true }), // 7
  p('השער היה נעול בשרשרת.'), // 8
  h(1, 'חלק שני: מלח', { pageBreakBefore: true }), // 9
  h(2, 'פרק 3', { pageBreakBefore: false }), // 10: only a number…
  h(3, 'כפור'), // 11: …and its name below it
  p('הכפור הגיע מוקדם.'), // 12
]

/** An English manuscript typed without heading styles: "Chapter" lines and page breaks. */
const english: ManuscriptParagraph[] = [
  p('THE SALT ORCHARD'), // 0
  p('by Ines Varga'), // 1
  p('Chapter One', { pageBreakBefore: true }), // 2
  p('The Crossing'), // 3
  p('The ferry left before dawn, and Ines was not on it.'), // 4
  p(''), // 5: an empty paragraph, for spacing
  p('#'), // 6
  p('She did not wait for noon.'), // 7
  p('Chapter Two: The Orchard Gate', { pageBreakBefore: true }), // 8
  p('The gate was chained shut.'), // 9
  p('Part of me wanted to stay, she wrote.'), // 10: a sentence, not a part
]

const summary = (
  paragraphs: ManuscriptParagraph[],
  ...args: Parameters<typeof splitManuscript> extends [unknown, ...infer R] ? R : never
) => splitManuscript(paragraphs, ...args).chapters.map((c) => ({ part: c.part, name: c.name, body: c.body, included: c.included }))

describe('splitting by headings', () => {
  it('makes parts of the bigger headings and chapters of the next, without their numbers, and leaves the title page out', () => {
    const plan = splitManuscript(hebrew, 'headings')
    expect(plan.frontMatter).toEqual([0, 1])
    expect(plan.chapters.map((c) => ({ part: c.part, name: c.name, body: c.body }))).toEqual([
      { part: 'חלק ראשון: הגעה', name: 'המעבר', body: [4, 5, 6] },
      { part: 'חלק ראשון: הגעה', name: 'שער המטע', body: [8] },
      { part: 'חלק שני: מלח', name: 'כפור', body: [12] },
    ])
  })

  it('takes the title and author from the title page', () => {
    expect(splitManuscript(hebrew, 'headings')).toMatchObject({ title: 'מטע המלח', author: 'אינס ורגה' })
  })

  it('keeps one level of headings as chapters, and deeper headings inside them', () => {
    const scenes = [h(1, 'The Crossing'), p('Text.'), h(2, 'Night'), p('More.'), h(1, 'Frost'), p('Cold.')]
    expect(summary(scenes, 'headings')).toEqual([
      { part: null, name: 'The Crossing', body: [1, 2, 3], included: true },
      { part: null, name: 'Frost', body: [5], included: true },
    ])
  })

  it('reads Plot Device’s own Word export: "Chapter 1" above the name, and parts in the same heading level', () => {
    const exported = [
      p('Ines Varga'),
      p('about 84,000 words'),
      p('The Salt Orchard', { title: true }),
      h(1, 'Chapter 1\nPrologue'),
      p('Before.'),
      h(1, 'Part One: Arrival'),
      h(1, 'Chapter 2\nThe Crossing'),
      p('The ferry.'),
    ]
    expect(summary(exported, 'headings')).toEqual([
      { part: null, name: 'Prologue', body: [4], included: true },
      { part: 'Part One: Arrival', name: 'The Crossing', body: [7], included: true },
    ])
  })

  it('sees parts when each has a single chapter', () => {
    const oneEach = [h(1, 'Part One'), h(2, 'Chapter 1: A'), p('Text.'), h(1, 'Part Two'), h(2, 'Chapter 2: B'), p('More.')]
    expect(summary(oneEach, 'headings').map((c) => [c.part, c.name])).toEqual([
      ['Part One', 'A'],
      ['Part Two', 'B'],
    ])
  })
})

describe('splitting by “Chapter” lines', () => {
  it('starts a chapter at each line, takes a short line below a bare number as its name, and drops empty paragraphs', () => {
    const plan = splitManuscript(english, 'chapter-lines')
    expect(plan.frontMatter).toEqual([0, 1])
    expect(plan.chapters.map((c) => ({ name: c.name, body: c.body }))).toEqual([
      { name: 'The Crossing', body: [4, 6, 7] },
      { name: 'The Orchard Gate', body: [9, 10] },
    ])
    expect(plan).toMatchObject({ title: 'THE SALT ORCHARD', author: 'Ines Varga' })
  })

  it('recognises part lines', () => {
    const parts = [p('Part One'), p('Chapter 1: A'), p('Text.'), p('Part Two'), p('Chapter 2: B'), p('Text.')]
    expect(summary(parts, 'chapter-lines').map((c) => [c.part, c.name])).toEqual([
      ['Part One', 'A'],
      ['Part Two', 'B'],
    ])
  })
})

describe('splitting by page breaks', () => {
  it('starts a chapter at each new page, names it from its first line, and leaves a title page out', () => {
    const plan = splitManuscript(english, 'page-breaks')
    expect(plan.frontMatter).toEqual([0, 1])
    expect(plan.chapters.map((c) => ({ name: c.name, body: c.body }))).toEqual([
      { name: 'The Crossing', body: [4, 6, 7] },
      { name: 'The Orchard Gate', body: [9, 10] },
    ])
  })

  it('names a page without a heading from its first words', () => {
    const pages = [p('The ferry left before dawn and nobody saw it go.'), p('The gate was chained.', { pageBreakBefore: true })]
    expect(summary(pages, 'page-breaks').map((c) => c.name)).toEqual(['The ferry left before dawn and…', 'The gate was chained.'])
  })
})

describe('the author’s own changes in the preview', () => {
  it('starts a chapter at any paragraph, named from its first words, in the same part', () => {
    expect(summary(hebrew, 'headings', { starts: [6] }).map((c) => [c.part, c.name, c.body])).toEqual([
      ['חלק ראשון: הגעה', 'המעבר', [4, 5]],
      ['חלק ראשון: הגעה', 'היא לא חיכתה לצהריים.', [6]],
      ['חלק ראשון: הגעה', 'שער המטע', [8]],
      ['חלק שני: מלח', 'כפור', [12]],
    ])
  })

  it('joins a chapter to the one above, keeping its heading as text', () => {
    const joined = summary(hebrew, 'headings', { joins: [7] })
    expect(joined.map((c) => [c.name, c.body])).toEqual([
      ['המעבר', [4, 5, 6, 7, 8]],
      ['כפור', [12]],
    ])
  })

  it('renames chapters and leaves unticked ones out, by where they start', () => {
    const plan = splitManuscript(hebrew, 'headings', { names: { 7: 'השער' }, leftOut: [3] })
    expect(plan.chapters.map((c) => [c.start, c.name, c.included])).toEqual([
      [3, 'המעבר', false],
      [7, 'השער', true],
      [10, 'כפור', true],
    ])
  })

  it('ignores changes that name paragraphs it doesn’t have', () => {
    expect(summary(hebrew, 'headings', { starts: [-1, 99], joins: [42] })).toEqual(summary(hebrew, 'headings'))
  })
})

describe('choosing how to split', () => {
  it('prefers headings, then “Chapter” lines, then page breaks', () => {
    expect(chooseSplit(hebrew)).toBe('headings')
    expect(chooseSplit(english)).toBe('chapter-lines')
    expect(chooseSplit([p('One.'), p('Two.', { pageBreakBefore: true })])).toBe('page-breaks')
  })

  it('makes one chapter of a file with nothing to split by, named after its title', () => {
    expect(chooseSplit([p('Just text.'), p('More text.')])).toBe('headings')
    expect(splitManuscript([p('Salt', { title: true }), p('Just text.')], 'headings').chapters.map((c) => [c.name, c.body])).toEqual([
      ['Salt', [1]],
    ])
  })

  it('counts each chapter’s words, leaving scene breaks out', () => {
    expect(splitManuscript(hebrew, 'headings').chapters[0]?.words).toBe(9)
  })
})

describe('nothing is lost or doubled', () => {
  /** Every non-empty paragraph is in exactly one place: the title page, a chapter's text, or a heading or name the split used. */
  function accountedFor(
    paragraphs: ManuscriptParagraph[],
    split: 'headings' | 'chapter-lines' | 'page-breaks',
    edits: Parameters<typeof splitManuscript>[2],
  ) {
    const plan = splitManuscript(paragraphs, split, edits)
    const inText = plan.chapters.flatMap((c) => c.body)
    expect(new Set(inText).size).toBe(inText.length) // nothing twice
    expect(inText.filter((i) => plan.frontMatter.includes(i))).toEqual([])
    const placed = new Set([...inText, ...plan.frontMatter])
    // What isn't placed must be a heading, part or name line the split turned into names.
    for (const [index, paragraph] of paragraphs.entries()) {
      if (paragraph.text.trim() === '' || placed.has(index)) continue
      const text = paragraph.text.replace(/\s*\n\s*/g, ' ').trim()
      const named =
        plan.chapters.some((c) => c.part === text || text.includes(c.name) || c.name.includes(text)) || chapterLine(text)?.name === ''
      expect(named, `paragraph ${index} (“${text}”) went missing`).toBe(true)
    }
    // Each chapter's text is in reading order.
    for (const chapter of plan.chapters) expect([...chapter.body].sort((a, b) => a - b)).toEqual(chapter.body)
  }

  it('in every split, with any starts and joins (seeded)', () => {
    let seed = 7
    const random = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31
    for (const paragraphs of [hebrew, english]) {
      for (const split of ['headings', 'chapter-lines', 'page-breaks'] as const) {
        for (let round = 0; round < 50; round++) {
          const pick = () => Math.floor(random() * (paragraphs.length + 2)) - 1
          accountedFor(paragraphs, split, { starts: [pick(), pick()], joins: [pick(), pick()] })
        }
      }
    }
  })
})
