import { describe, expect, it } from 'vitest'
import { createTranslator } from '../../../i18n/translator'
import type { EntryPlace, EntryPlaceLabel } from '../app/entry-place'
import {
  formatEntryPlaceCrumb,
  formatEntryPlaceLabel,
  formatEntryPlaceTitle
} from './entry-place-label'

const english = createTranslator('en').t
const hebrew = createTranslator('he').t

describe('entry-place labels', () => {
  it.each([
    [{ type: 'part', number: 1 }, 'Part I', 'חלק I'],
    [{ type: 'not-in-sequence' }, 'Not in sequence', 'לא ברצף הממוספר'],
    [{ type: 'chapter', number: 2 }, 'Chapter 2', 'פרק 2'],
    [
      { type: 'part-chapter', partNumber: 1, chapterNumber: 2 },
      'Part I · Chapter 2',
      'חלק I · פרק 2'
    ],
    [{ type: 'part-chapter', partNumber: 1 }, 'Part I', 'חלק I'],
    [
      { type: 'unsequenced-part-chapter', partTitle: 'Part <א>' },
      '⁨Part <א>⁩ · not in sequence',
      '⁨Part <א>⁩ · לא ברצף הממוספר'
    ],
    [{ type: 'unordered' }, 'Unordered', 'ללא סדר'],
    [{ type: 'codex-kind', kind: 'character' }, 'Character', 'דמות'],
    [{ type: 'codex-kind', kind: 'location' }, 'Location', 'מקום'],
    [{ type: 'codex-kind', kind: 'note' }, 'Note', 'הערה'],
    [{ type: 'outline' }, 'Outline', 'מתווה'],
    [{ type: 'template' }, 'Template', 'תבנית']
  ] satisfies [EntryPlaceLabel, string, string][])(
    'formats %s in English and Hebrew',
    (label, en, he) => {
      expect(formatEntryPlaceLabel(label, english)).toBe(en)
      expect(formatEntryPlaceLabel(label, hebrew)).toBe(he)
    }
  )

  it('formats the short chapter breadcrumb without parsing translated text', () => {
    expect(
      formatEntryPlaceCrumb(
        { type: 'part-chapter', partNumber: 1, chapterNumber: 2 },
        hebrew
      )
    ).toBe('פרק 2')
    expect(formatEntryPlaceCrumb({ type: 'unsequenced-part-chapter', partTitle: 'Part I' }, hebrew))
      .toBe('לא ברצף הממוספר')
  })

  it('translates generated template titles and preserves author-written titles', () => {
    const template: EntryPlace = {
      kind: 'template',
      title: 'Character template',
      label: { type: 'template' },
      templateOf: 'character'
    }
    const authored: EntryPlace = {
      kind: 'character',
      title: 'My Character',
      label: { type: 'codex-kind', kind: 'character' }
    }
    expect(formatEntryPlaceTitle(template, english)).toBe('Character template')
    expect(formatEntryPlaceTitle(template, hebrew)).toBe('תבנית לדמות')
    expect(formatEntryPlaceTitle(authored, hebrew)).toBe('My Character')
  })
})
