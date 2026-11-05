import { describe, expect, it } from 'vitest'
import { headingAnchor, lineUpTarget, sectionAnchors } from './line-up'
import type { Outline, OutlineSection } from './outline'

const section = (name: string | null): OutlineSection => ({ name, intro: [], items: [], notes: [], lineUp: null })
const outline = (...names: (string | null)[]): Outline => ({ title: null, preamble: [], sections: names.map(section) })

describe('heading anchors', () => {
  it('lowercases, drops punctuation and joins words with hyphens', () => {
    expect(headingAnchor('The night of the storm')).toBe('the-night-of-the-storm')
    expect(headingAnchor('Prologue: the last summer!')).toBe('prologue-the-last-summer')
    expect(headingAnchor('Bea’s path, part 2')).toBe('beas-path-part-2')
  })

  it('keeps Hebrew letters and points, and drops the maqaf and geresh as punctuation', () => {
    expect(headingAnchor('ליל הסערה')).toBe('ליל-הסערה')
    expect(headingAnchor('בֹּקֶר')).toBe('בֹּקֶר')
    expect(headingAnchor('בית־הספר של ג׳ני')).toBe('ביתהספר-של-גני')
  })

  it('keeps accented letters and digits, and drops Markdown emphasis', () => {
    expect(headingAnchor('Café 1912')).toBe('café-1912')
    expect(headingAnchor('*The* crossing')).toBe('the-crossing')
  })

  it('numbers repeated headings from the second, as GitHub does', () => {
    expect(sectionAnchors(outline(null, 'Day 3', 'Night', 'Day 3', 'Day 3'))).toEqual([null, 'day-3', 'night', 'day-3-1', 'day-3-2'])
  })
})

describe('the section a line-up points to', () => {
  const main = outline(null, 'Spring, 1912', 'The night of the storm', 'Spring, 1912')

  it('is found by its anchor', () => {
    expect(lineUpTarget(main, 'the-night-of-the-storm')).toBe(2)
    expect(lineUpTarget(main, 'spring-1912-1')).toBe(3)
  })

  it('is found by the heading text too, ignoring case and spaces around it', () => {
    expect(lineUpTarget(main, ' The Night of the Storm ')).toBe(2)
  })

  it('is missing when no section matches, and the unnamed section is never a target', () => {
    expect(lineUpTarget(main, 'the-flood')).toBeNull()
    expect(lineUpTarget(main, '')).toBeNull()
  })

  it('finds Hebrew anchors written percent-encoded', () => {
    const hebrew = outline('ליל הסערה')
    expect(lineUpTarget(hebrew, encodeURIComponent('ליל-הסערה'))).toBe(0)
  })
})
