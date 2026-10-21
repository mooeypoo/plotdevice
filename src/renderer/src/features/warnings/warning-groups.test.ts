import { describe, expect, it } from 'vitest'
import { sampleManuscript } from '../../app/fake-plot-device-api'
import { createTranslator } from '../../../../i18n/translator'
import { countWarnings, groupWarnings } from './warning-groups'

const english = createTranslator('en')

describe('groupWarnings', () => {
  it('groups problems and warnings by kind, most serious first', () => {
    const groups = groupWarnings(
      [
        { path: 'notes/Chapter #3.md', problem: 'name-breaks-links' },
        { path: 'manuscript/Broken.md', problem: 'unparseable-frontmatter' }
      ],
      [
        {
          code: 'setting-invalid',
          key: 'file_names',
          value: '"sometimes"',
          expected: 'file-name-sync'
        }
      ],
      {
        ...sampleManuscript,
        warnings: [
          {
            code: 'ambiguous-link',
            title: 'The Ferry',
            link: '[[Marrow]]',
            location: { kind: 'body' },
            choices: ['characters/Marrow.md', 'locations/Marrow.md'],
            paths: ['The Ferry.md']
          },
          {
            code: 'duplicate-chapter-order',
            order: 2,
            titles: ['A', 'B'],
            paths: ['a.md', 'b.md']
          }
        ]
      },
      english.t
    )
    expect(groups.map((group) => group.heading)).toEqual([
      'Files left untouched',
      'Names that break links',
      'Links that could mean two files',
      'Order',
      'Project'
    ])
    expect(groups[2]?.items[0]?.message).toContain('could mean')
    expect(groups[2]?.items[0]?.path).toBe('The Ferry.md')
    expect(groups[2]?.items[0]?.key).not.toContain('could mean')
    expect(groups[4]?.items[0]).not.toHaveProperty('path')
    expect(countWarnings(groups)).toBe(5)
  })

  it('is empty when nothing needs attention', () => {
    expect(groupWarnings([], [], sampleManuscript, english.t)).toEqual([])
  })

  it('keeps group and row identities and fixes across locales, including repeated diagnostics', () => {
    const warning = {
      code: 'unusable-value' as const,
      reason: 'not-link' as const,
      title: 'יעל (Draft)',
      key: 'pov',
      value: '7',
      paths: ['יעל.md'],
      fix: { kind: 'quote' as const, key: 'pov' }
    }
    const manuscript = { ...sampleManuscript, warnings: [warning, warning] }
    const source = JSON.stringify(manuscript)
    const en = groupWarnings([], [], manuscript, english.t)
    const he = groupWarnings([], [], manuscript, createTranslator('he').t)
    expect(he.map((group) => group.id)).toEqual(en.map((group) => group.id))
    expect(he[0]?.heading).not.toBe(en[0]?.heading)
    expect(he[0]?.items.map(({ key, path, fix }) => ({ key, path, fix }))).toEqual(
      en[0]?.items.map(({ key, path, fix }) => ({ key, path, fix }))
    )
    expect(new Set(he[0]?.items.map((item) => item.key)).size).toBe(2)
    expect(he[0]?.items[0]?.message).toContain('\u2068יעל (Draft)\u2069')
    expect(JSON.stringify(manuscript)).toBe(source)
  })
})
