import { describe, expect, it } from 'vitest'
import { countWords, roundWordCount } from './word-count'

describe('counting words as a word processor does', () => {
  it.each([
    ['The ferry left before dawn.', 5],
    ['המעבורת יצאה לפני עלות השחר.', 5],
    // Hebrew prefixes are part of the word; a maqaf joins words into one, as a hyphen does in English.
    ['ובבית־הספר למדו well-known שירים.', 4],
    ['צה"ל וצה״ל', 2], // gershayim, typed either way, stay inside the word
    ['“There’ll be another at noon,” the porter said.', 8],
    ['Ilka אמרה: "זה לא המטע שלי".', 6], // mixed directions
    ['שָׁלוֹם, עוֹלָם', 2], // niqqud doesn't split a word
    ['Noël and Zoë', 3], // combining and precomposed accents alike
    ['1904 was the year', 4], // numbers count
  ])('%s → %i', (text, words) => {
    expect(countWords(text)).toBe(words)
  })

  it('doesn’t count punctuation, dashes or emoji standing alone', () => {
    expect(countWords('She waited — and waited … 🌊 !')).toBe(4)
  })

  it('counts across lines, tabs and odd spaces', () => {
    expect(countWords('one\ntwo\r\nthree\tfour five six')).toBe(6)
  })

  it('is zero for empty or blank text', () => {
    expect(countWords('')).toBe(0)
    expect(countWords(' \n\t ')).toBe(0)
  })
})

describe('rounding the word count for a title page', () => {
  it.each([
    [0, 0],
    [7, 7],
    [999, 999], // exact under a thousand
    [1_049, 1_000],
    [1_050, 1_100], // nearest hundred below ten thousand
    [9_949, 9_900],
    [9_950, 10_000],
    [84_412, 84_000], // nearest thousand from ten thousand
    [84_500, 85_000],
    [123_456, 123_000],
  ])('%i → %i', (count, rounded) => {
    expect(roundWordCount(count)).toBe(rounded)
  })
})
