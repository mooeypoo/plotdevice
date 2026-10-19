import { describe, expect, it } from 'vitest'
import { countWords } from './word-count'

describe('countWords', () => {
  it.each([
    ['', 0],
    ['   \n\n ', 0],
    ['The ferry nosed into the jetty.', 6],
    ['“You’re late,” Noël said.', 4],
    ['She said—the whole of it—Ilka.', 7],
    ['A well-known, long-forgotten road.', 4],
    ['Chapter 3 begins in 1952.', 5]
  ])('counts %j as %i', (text, expected) => {
    expect(countWords(text)).toBe(expected)
  })

  it('ignores markdown syntax', () => {
    expect(
      countWords('## The Dock\n\n*Ilka* saw **him** first.\n\n> A quote\n\n- one\n- two')
    ).toBe(10)
  })

  it('counts the shown text of a wikilink, not its target', () => {
    expect(countWords('[[Ilka Szabó|Ilka]] saw [[Aunt Bea]].')).toBe(4)
    expect(countWords('See [[Ilka Szabó#History|her past]].')).toBe(3)
  })

  it('does not count embeds, which pull in other files', () => {
    expect(countWords('Before. ![[Marrow#Mill]] After.')).toBe(2)
  })

  it('counts the text of a markdown link', () => {
    expect(countWords('Read [the old script](notes/script.md) slowly.')).toBe(5)
  })

  it('leaves out Obsidian and HTML comments', () => {
    expect(countWords('Kept. %% a note to myself %% Also kept.')).toBe(3)
    expect(countWords('Kept.\n%%\nmulti\nline\n%%\nKept.')).toBe(2)
    expect(countWords('Kept. <!-- hidden words --> Kept.')).toBe(2)
  })

  it('counts Hebrew words, including ones with niqqud and attached prefixes', () => {
    expect(countWords('בְּרֵאשִׁית הָיָה הַנָּהָר, וְ[[יעל]] יָרְדָה אֵלָיו בַּבֹּקֶר.')).toBe(7)
    expect(countWords('היא לא ידעה שאילקה כבר מחכה לה.')).toBe(7)
  })
})
