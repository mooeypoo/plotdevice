import { describe, expect, it } from 'vitest'
import { authorLine, chapterLine, isSceneBreakText, partLine } from './chapter-lines'

describe('recognising a line that starts a chapter', () => {
  it.each([
    ['Chapter 3', ''],
    ['Chapter 3: The Crossing', 'The Crossing'],
    ['CHAPTER THREE', ''],
    ['Chapter Twenty-One — Salt', 'Salt'],
    ['Chapter XIV. Frost', 'Frost'],
    ['Ch. 7 - The Ledger', 'The Ledger'],
    ['פרק 3', ''],
    ['פרק 3: המעבר', 'המעבר'],
    ['פרק שלישי', ''],
    ['פרק שלישי – כפור', 'כפור'],
    ['פרק ג׳', ''],
    ['פרק י"א: הבאר', 'הבאר'],
    ['פרק עשרים ואחד', ''],
  ])('%s → name “%s”', (text, name) => {
    expect(chapterLine(text)).toEqual({ name })
  })

  it.each([
    'Chapters of my life were short.',
    'Chapter and verse, she said.',
    'The chapter 3 notes',
    'פרקים רבים עברו',
    'פרק הזמן הזה היה קשה',
    'A chapter',
    '',
  ])('isn’t fooled by “%s”', (text) => {
    expect(chapterLine(text)).toBeNull()
  })

  it('reads only the first line, so “Chapter 1” above the name on a second line works', () => {
    expect(chapterLine('פרק 1\nפתיחה')).toEqual({ name: 'פתיחה' })
    expect(chapterLine('Chapter 1\nThe Crossing')).toEqual({ name: 'The Crossing' })
  })
})

describe('recognising parts, bylines and scene breaks', () => {
  it.each([
    ['Part One: Arrival', 'Part One: Arrival'],
    ['PART 2', 'PART 2'],
    ['Book Three', 'Book Three'],
    ['חלק ראשון: הגעה', 'חלק ראשון: הגעה'],
    ['חלק ב׳', 'חלק ב׳'],
  ])('%s is a part', (text, name) => {
    expect(partLine(text)).toEqual({ name })
  })

  it('isn’t fooled by ordinary sentences', () => {
    expect(partLine('Part of me wanted to stay.')).toBeNull()
    expect(partLine('חלק מהעצים נפלו.')).toBeNull()
  })

  it.each([
    ['by Ines Varga', 'Ines Varga'],
    ['By INES VARGA', 'INES VARGA'],
    ['מאת אינס ורגה', 'אינס ורגה'],
  ])('“%s” names the author', (text, author) => {
    expect(authorLine(text)).toBe(author)
  })

  it.each(['* * *', '***', '#', '* * * *', ' ~ ', '⁂', '---', '###'])('“%s” is a scene break', (text) => {
    expect(isSceneBreakText(text)).toBe(true)
  })

  it.each(['* note', '#1', 'Three stars', ''])('“%s” isn’t a scene break', (text) => {
    expect(isSceneBreakText(text)).toBe(false)
  })
})
