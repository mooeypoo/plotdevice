import { splitManuscript } from '@plotdevice/domain'
import { describe, expect, it } from 'vitest'
import { importedChapters } from './chapters'
import { ENGLISH_BOOK, HEBREW_BOOK } from './docx-fixtures.test-support'
import { readDocx, type ImportedManuscript } from './read-docx'

async function read(bytes: Uint8Array): Promise<ImportedManuscript> {
  const result = await readDocx(bytes)
  if (!result.ok) throw new Error(result.error)
  return result.value
}

describe('a Word manuscript’s chapters, as Markdown', () => {
  it('writes each chapter of a Hebrew manuscript, with its part, notes, scene break, list, quote and direction marks', async () => {
    const manuscript = await read(HEBREW_BOOK)
    const chapters = importedChapters(manuscript, splitManuscript(manuscript.paragraphs, 'headings'), 'rtl')
    expect(chapters.map((c) => [c.part, c.title])).toEqual([
      ['חלק ראשון: הגעה', 'המעבר'],
      ['חלק שני: מלח', 'רוח מלוחה'],
    ])
    expect(chapters[0]?.body).toBe(
      [
        'המעבורת יצאה לפני עלות השחר, *ו*אינס לא הייתה עליה.[^1]',
        '',
        'נואל ענה: It was never ושתק.',
        '',
        '::: {dir=ltr}',
        'The letter was sent in English.',
        ':::',
        '',
        'היא לא חיכתה לצהריים.',
        '',
        '* * *',
        '',
        '1. פריט ראשון',
        '2. פריט שני',
        '',
        '> ציטוט מהמכתב.',
        '',
        '[^1]: בשנת 1904 המעבר ארך שעתיים.',
        '',
      ].join('\n'),
    )
    // Footnotes start again from 1 in each chapter.
    expect(chapters[1]?.body).toBe('הרוח באה מהים.[^1]\n\n[^1]: A *second* note.\n')
  })

  it('leaves out the chapters the author unticked, and uses their new names', async () => {
    const manuscript = await read(ENGLISH_BOOK)
    const plan = splitManuscript(manuscript.paragraphs, 'chapter-lines', { leftOut: [2], names: { 7: 'Salt' } })
    const chapters = importedChapters(manuscript, plan, 'ltr')
    expect(chapters.map((c) => c.title)).toEqual(['Salt'])
    expect(chapters[0]?.body).toBe(
      'The salt had reached the first rows.\n\nLast line of chapter two.\n\nA page that starts with no heading at all.\n',
    )
  })
})
