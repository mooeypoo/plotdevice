import type { ProjectPath } from '@plotdevice/shared'
import { describe, expect, it } from 'vitest'
import { editOutline } from './edit-outline'
import { readLineUp } from './line-up'
import type { OutlineEdit } from './outline-model'
import { fixture, fixtureNames } from './outline.test-support'
import { readOutline } from './read-outline'

const BEA = 'outlines/beas-path.md' as ProjectPath

/** The line-up of each section of `text`, as `outline#anchor`, or `null`. */
function lineUps(text: string, file: ProjectPath = BEA): (string | null)[] {
  const parsed = readOutline(text)
  return parsed.sections.map((section) => {
    const found = readLineUp(text, section.intro, file)
    return found && `${found.outline}#${found.anchor}`
  })
}

function edited(text: string, edit: OutlineEdit): string {
  const result = editOutline(text, edit, { file: BEA })
  if (!result.ok) throw new Error(result.error)
  return result.value
}

const night = { outline: 'outlines/main-story.md', anchor: 'the-night-of-the-storm', text: 'The night of the storm' }
const lineUp = (section: number, words = 'At the same time as '): OutlineEdit => ({
  kind: 'line-up-section',
  section,
  lineUp: night,
  words,
})
const unpin = (section: number): OutlineEdit => ({ kind: 'unpin-section', section })

describe('reading a line-up', () => {
  it('reads the link in a section’s intro line, whatever the words around it', () => {
    const text = [
      '# Bea’s path',
      '',
      '## Hiding at the boathouse',
      'At the same time as [The night of the storm](main-story.md#the-night-of-the-storm)',
      '- Hides the letter',
      '',
      '## בעיר',
      'במקביל ל־[ליל הסערה](main-story.md#ליל-הסערה), בערך',
      '',
      '- מוכרת את הסיכה',
      '',
    ].join('\n')
    expect(lineUps(text)).toEqual(['outlines/main-story.md#the-night-of-the-storm', 'outlines/main-story.md#ליל-הסערה'])
  })

  it('decodes the anchor and keeps the link text as written', () => {
    const text = '## A\nSame night as [*The* night](<main story.md#The%20night>)\n- x\n'
    expect(readLineUp(text, readOutline(text).sections[0]?.intro ?? [], BEA)).toMatchObject({
      outline: 'outlines/main story.md',
      anchor: 'The night',
      text: '*The* night',
    })
  })

  it('lines nothing up from links to pages, chapters, the same outline, or another outline without a section', () => {
    const text = [
      '## A',
      'About [Bea](../characters/bea.md#childhood)',
      '## B',
      'Told in [The Crossing](../manuscript/the-crossing.md)',
      '## C',
      'Back to [Hiding](beas-path.md#hiding)',
      '## D',
      'See [Main story](main-story.md)',
      '## E',
      'Web [link](https://example.com/outlines/x.md#y) and an image ![map](main-story.md#map)',
      '',
    ].join('\n')
    expect(lineUps(text)).toEqual([null, null, null, null, null])
  })

  it('needs exactly one link to another outline’s section in the paragraph, and takes the first paragraph that has one', () => {
    const text = [
      '## Two links',
      'Between [Spring](main-story.md#spring) and [Frost](main-story.md#frost)',
      '## Second paragraph',
      'Bea is alone here.',
      '',
      'At the same time as [Frost](main-story.md#frost), with a note about [Bea](../characters/bea.md)',
      '- x',
      '## After the cards',
      '- x',
      '',
      'At the same time as [Frost](main-story.md#frost)',
      '',
    ].join('\n')
    expect(lineUps(text)).toEqual([null, 'outlines/main-story.md#frost', null])
  })

  it('ignores links in code', () => {
    const text = '## A\nWrite `[The night](main-story.md#the-night)` to line up\n- x\n'
    expect(lineUps(text)).toEqual([null])
  })
})

describe('writing a line-up', () => {
  it('adds the line under the heading, before the cards', () => {
    expect(edited('## Hiding\n- Hides the letter\n', lineUp(0))).toBe(
      '## Hiding\nAt the same time as [The night of the storm](main-story.md#the-night-of-the-storm)\n- Hides the letter\n',
    )
  })

  it('goes after the blank line under the heading where there is one, and in an empty section', () => {
    expect(edited('## Hiding\n\n- Hides the letter\n', lineUp(0))).toBe(
      '## Hiding\n\nAt the same time as [The night of the storm](main-story.md#the-night-of-the-storm)\n- Hides the letter\n',
    )
    expect(edited('## Hiding\n\n## Next\n', lineUp(0))).toBe(
      '## Hiding\n\nAt the same time as [The night of the storm](main-story.md#the-night-of-the-storm)\n\n## Next\n',
    )
  })

  it('keeps an intro paragraph of the author’s own apart, so the two don’t merge', () => {
    expect(edited('## Hiding\nBea is alone here.\n- x\n', lineUp(0))).toBe(
      '## Hiding\nAt the same time as [The night of the storm](main-story.md#the-night-of-the-storm)\n\nBea is alone here.\n- x\n',
    )
  })

  it('writes Hebrew words and a Hebrew anchor as they are, and CRLF where the file uses it', () => {
    const hebrew = {
      kind: 'line-up-section',
      section: 0,
      words: 'במקביל ל־',
      lineUp: { outline: 'outlines/main-story.md', anchor: 'ליל-הסערה', text: 'ליל הסערה' },
    } as const
    expect(edited('## בעיר\r\n- מוכרת את הסיכה\r\n', hebrew)).toBe(
      '## בעיר\r\nבמקביל ל־[ליל הסערה](main-story.md#ליל-הסערה)\r\n- מוכרת את הסיכה\r\n',
    )
  })

  it('escapes brackets in the link text and wraps a path with spaces', () => {
    const edit: OutlineEdit = {
      kind: 'line-up-section',
      section: 0,
      words: '',
      lineUp: { outline: 'outlines/main story.md', anchor: 'day-3', text: 'Day [3]' },
    }
    expect(edited('## A\n', edit)).toBe('## A\n[Day \\[3\\]](<main story.md#day-3>)\n')
  })

  it('lining up again changes only the link, keeping the author’s words', () => {
    const text = '## Hiding\nRoughly when [Spring](main-story.md#spring) ends\n- x\n'
    expect(edited(text, lineUp(0))).toBe(
      '## Hiding\nRoughly when [The night of the storm](main-story.md#the-night-of-the-storm) ends\n- x\n',
    )
  })

  it('refuses the unnamed section and a missing one', () => {
    expect(editOutline('- loose\n## A\n', lineUp(0), { file: BEA })).toEqual({ ok: false, error: 'unnamed-section' })
    expect(editOutline('## A\n', lineUp(3), { file: BEA })).toEqual({ ok: false, error: 'no-such-section' })
  })
})

describe('unpinning', () => {
  const originals = [
    '## Hiding\n- Hides the letter\n',
    '## Hiding\n\n- Hides the letter\n',
    '## Hiding\n\n## Next\n- x\n',
    '## Hiding\nBea is alone here.\n- x\n',
    '## Hiding\n\nBea is alone here.\n\n- x\n',
    '# Bea\r\n\r\n## Hiding\r\n\r\n- x\r\n',
    '## Hiding',
  ]

  it.each(originals)('after lining up gives back the file byte for byte: %j', (original) => {
    expect(edited(edited(original, lineUp(0)), unpin(0))).toBe(original)
  })

  it('removes a line-up the author wrote, with its blank line', () => {
    expect(edited('## Hiding\n\nSame night as [Night](main-story.md#night)\n\n- x\n', unpin(0))).toBe('## Hiding\n\n- x\n')
    expect(edited('## Hiding\n\nSame night as [Night](main-story.md#night)\n\nBea is alone.\n', unpin(0))).toBe(
      '## Hiding\n\nBea is alone.\n',
    )
  })

  it('keeps the words of a longer paragraph, leaving the link’s text in place of the link', () => {
    expect(edited('## Hiding\nThe same night as [the storm](main-story.md#night),\nwhile Ilka sleeps.\n- x\n', unpin(0))).toBe(
      '## Hiding\nThe same night as the storm,\nwhile Ilka sleeps.\n- x\n',
    )
  })

  it('changes nothing in a section that isn’t lined up', () => {
    expect(edited('## Hiding\nAbout [Bea](../characters/bea.md)\n- x\n', unpin(0))).toBe(
      '## Hiding\nAbout [Bea](../characters/bea.md)\n- x\n',
    )
  })
})

describe('every outline fixture', () => {
  it.each(fixtureNames)('%s: each section lines up, reads back, keeps its cards, and unpins byte for byte', (name) => {
    const original = fixture(name)
    const before = readOutline(original)
    before.sections.forEach((section, index) => {
      if (!section.heading || readLineUp(original, section.intro, BEA)) return
      const lined = edited(original, lineUp(index))
      const after = readOutline(lined)
      expect(after.sections.map((s) => s.heading?.text ?? null)).toEqual(before.sections.map((s) => s.heading?.text ?? null))
      expect(after.sections.map((s) => s.items.map((item) => item.text))).toEqual(
        before.sections.map((s) => s.items.map((item) => item.text)),
      )
      expect(lineUps(lined).filter(Boolean)).toEqual(['outlines/main-story.md#the-night-of-the-storm'])
      expect(edited(lined, unpin(index))).toBe(original)
    })
  })
})
