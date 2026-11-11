import type { ReferenceSummaryView } from '@plotdevice/contracts'
import type { ProjectPath } from '@plotdevice/shared'
import { describe, expect, it } from 'vitest'
import { CHAPTER_UNITS, kindLabels, kindOrder, knownUnit, PART_UNITS, unsortedFolders } from './kinds'

/** The message key and its values, so the tests see which message is used. */
const t = (key: string, ...params: (string | number)[]): string => [key, ...params].join(':')
const page = (file: string, kind: string) => ({ file: file as ProjectPath, kind }) as ReferenceSummaryView
const defaults = [{ folder: 'characters' }, { folder: 'places' }, { folder: 'notes' }]
const campaign = [{ folder: 'characters', one: 'NPC', many: 'NPCs' }, { folder: 'פלגים', one: 'פלג', many: 'פלגים' }, { folder: 'notes' }]

describe('naming kinds (ADR 0011)', () => {
  it('the default kinds use the app’s own words, in the interface’s language', () => {
    const labels = kindLabels(defaults, 'characters', t)
    expect([labels.one, labels.many, labels.newPage, labels.empty, labels.all(3)]).toEqual([
      'kind-character',
      'story-character',
      'new-character',
      'gallery-empty-character',
      'tag-all-character:3',
    ])
  })

  it('the author’s kinds use their names, as typed, with no adjective to agree with', () => {
    const labels = kindLabels(campaign, 'פלגים', t)
    expect([labels.one, labels.many, labels.newPage, labels.empty, labels.all(2)]).toEqual([
      'פלג',
      'פלגים',
      'new-page-of-kind:פלג',
      'gallery-empty-kind:פלגים',
      'tag-all-kind:פלגים:2',
    ])
  })

  it('a default kind the author renamed uses the new names', () => {
    expect(kindLabels(campaign, 'characters', t).many).toBe('NPCs')
  })

  it('an unsorted folder is named as it is on disk', () => {
    expect(kindLabels(defaults, 'world', t).many).toBe('world')
  })
})

describe('"Not sorted yet" (ADR 0011, decision 5)', () => {
  const pages = [
    page('characters/ilka.md', 'characters'),
    page('world/magic.md', 'world'),
    page('factions/a.md', 'factions'),
    page('world/b.md', 'world'),
  ]

  it('lists the folders the book doesn’t list, A to Z, once each', () => {
    expect(unsortedFolders(defaults, pages)).toEqual(['factions', 'world'])
  })

  it('orders kinds as the book lists them, then the unsorted', () => {
    expect(kindOrder(campaign, pages)).toEqual(['characters', 'פלגים', 'notes', 'factions', 'world'])
  })
})

describe('a template’s word for chapters and parts, in any language (ADR 0011, 0013)', () => {
  const catalogs: Record<string, Record<string, string>> = {
    en: { 'unit-poem': 'Poem', 'unit-session': 'Session', 'unit-section': 'Section' },
    he: { 'unit-poem': 'שיר', 'unit-session': 'מפגש', 'unit-section': 'אסופה' },
  }
  const wordsFor = (key: string) => Object.values(catalogs).map((messages) => messages[key] ?? '')

  it('is recognised whichever language the book was written in', () => {
    expect(knownUnit({ one: 'שיר' }, CHAPTER_UNITS, wordsFor)).toBe('poem')
    expect(knownUnit({ one: 'Session' }, CHAPTER_UNITS, wordsFor)).toBe('session')
    expect(knownUnit({ one: ' poem ' }, CHAPTER_UNITS, wordsFor)).toBe('poem')
    expect(knownUnit({ one: 'אסופה' }, PART_UNITS, wordsFor)).toBe('section')
  })

  it('leaves the author’s own words, and books without one, alone', () => {
    expect(knownUnit({ one: 'Canto' }, CHAPTER_UNITS, wordsFor)).toBeNull()
    expect(knownUnit({ one: 'אסופה' }, CHAPTER_UNITS, wordsFor)).toBeNull()
    expect(knownUnit(null, CHAPTER_UNITS, wordsFor)).toBeNull()
  })
})
