import { describe, expect, it } from 'vitest'
import { countWords } from './word-count'

describe('countWords', () => {
  it.each([
    ['', 0],
    ['   \n\n ', 0],
    ['The shuttle settled onto the dock.', 6],
    ['“You’re late,” Zoë said.', 4],
    ['She said—the whole of it—Mira.', 7],
    ['A well-known, long-forgotten road.', 4],
    ['Chapter 3 begins in 2187.', 5]
  ])('counts %j as %i', (text, expected) => {
    expect(countWords(text)).toBe(expected)
  })

  it('ignores markdown syntax', () => {
    expect(
      countWords('## The Dock\n\n*Mira* saw **him** first.\n\n> A quote\n\n- one\n- two')
    ).toBe(10)
  })

  it('counts the shown text of a wikilink, not its target', () => {
    expect(countWords('[[Mira Kovač|Mira]] saw [[Old Tal]].')).toBe(4)
    expect(countWords('See [[Mira Kovač#History|her past]].')).toBe(3)
  })

  it('does not count embeds, which pull in other files', () => {
    expect(countWords('Before. ![[Harbor#Docks]] After.')).toBe(2)
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
    expect(countWords('בְּרֵאשִׁית הָיָה הַנָּמָל, וְ[[נועה]] חָזְרָה אֵלָיו בַּלַּיְלָה.')).toBe(7)
    expect(countWords('היא לא ידעה שמירה כבר מחכה לה.')).toBe(7)
  })
})
