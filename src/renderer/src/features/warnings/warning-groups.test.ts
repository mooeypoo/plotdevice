import { describe, expect, it } from 'vitest'
import { sampleManuscript } from '../../app/fake-plot-device-api'
import { countWarnings, groupWarnings } from './warning-groups'

describe('groupWarnings', () => {
  it('groups problems and warnings by kind, most serious first', () => {
    const groups = groupWarnings(
      [
        { path: 'notes/Chapter #3.md', problem: 'name-breaks-links' },
        { path: 'manuscript/Broken.md', problem: 'unparseable-frontmatter' }
      ],
      [
        { code: 'setting-invalid', message: 'settings.file_names should be ask, always, or never.' }
      ],
      {
        ...sampleManuscript,
        warnings: [
          { code: 'ambiguous-link', message: 'The Ferry: [[Marrow]] …', paths: ['The Ferry.md'] },
          {
            code: 'duplicate-chapter-order',
            message: 'Chapters share order 2.',
            paths: ['a.md', 'b.md']
          }
        ]
      }
    )
    expect(groups.map((group) => group.heading)).toEqual([
      'Files left untouched',
      'Names that break links',
      'Links that could mean two files',
      'Order',
      'Project'
    ])
    expect(groups[2]?.items).toEqual([
      {
        key: 'ambiguous-link:The Ferry: [[Marrow]] …',
        message: 'The Ferry: [[Marrow]] …',
        path: 'The Ferry.md'
      }
    ])
    expect(groups[4]?.items[0]).not.toHaveProperty('path')
    expect(countWarnings(groups)).toBe(5)
  })

  it('is empty when nothing needs attention', () => {
    expect(groupWarnings([], [], sampleManuscript)).toEqual([])
  })
})
