import { describe, expect, it } from 'vitest'
import type { FileProblemDto, WarningDto } from '../../../../contract/dtos'
import { createTranslator } from '../../../../i18n/translator'
import { describeFileProblem } from '../welcome/describe-file-problem'
import { formatManuscriptWarning, formatProjectWarning } from './format-warning'

const english = createTranslator('en')
const hebrew = createTranslator('he')

describe('warning presentation', () => {
  it('preserves complete English diagnostic details apart from display-only isolation', () => {
    const warning = {
      code: 'ambiguous-link' as const,
      title: 'The Ferry',
      link: '[[Marrow]]',
      location: { kind: 'body' as const },
      choices: ['characters/Marrow.md', 'locations/Marrow.md'],
      paths: ['The Ferry.md']
    }
    expect(formatManuscriptWarning(warning, english.t).replace(/[\u2068\u2069]/gu, '')).toBe(
      'The Ferry: [[Marrow]] in the text could mean characters/Marrow.md or locations/Marrow.md. Write it with its folder, like [[characters/Marrow]].'
    )
    expect(
      formatManuscriptWarning(
        {
          code: 'unusable-value',
          reason: 'unquoted-link',
          title: 'The Ferry',
          key: 'pov',
          value: '[[Ilka]]',
          paths: ['The Ferry.md']
        },
        english.t
      ).replace(/[\u2068\u2069]/gu, '')
    ).toBe(
      'The Ferry: pov: [[Ilka]] isn’t in quotes, so YAML reads it as a list. Write pov: "[[Ilka]]".'
    )
    expect(
      formatProjectWarning(
        {
          code: 'setting-invalid',
          key: 'file_names',
          value: '"sometimes"',
          expected: 'file-name-sync'
        },
        english.t
      ).replace(/[\u2068\u2069]/gu, '')
    ).toBe(
      'settings.file_names should be ask, always, or never, not "sometimes"; using the default.'
    )
  })

  it.each([
    { code: 'novel-file-unreadable', problem: 'unreadable-file' },
    { code: 'novel-file-unreadable', problem: 'invalid-encoding' },
    { code: 'novel-file-unreadable', problem: 'unclosed-frontmatter' },
    { code: 'novel-file-unreadable', problem: 'unparseable-frontmatter' },
    { code: 'format-missing' },
    { code: 'format-invalid', value: '"bad (יעל)"' },
    { code: 'format-newer', version: 99 },
    { code: 'title-invalid' },
    { code: 'author-invalid' },
    { code: 'settings-invalid' },
    {
      code: 'setting-invalid',
      key: 'file_names',
      value: '"sometimes"',
      expected: 'file-name-sync'
    },
    { code: 'setting-invalid', key: 'order_prefix', value: '"yes"', expected: 'boolean' },
    { code: 'setting-invalid', key: 'folders', value: '7', expected: 'folder-mapping' },
    {
      code: 'setting-invalid',
      key: 'folders.chapter',
      value: '"/outside"',
      expected: 'visible-folder'
    }
  ] satisfies WarningDto[])(
    'localizes project warning %j from unchanged semantic data',
    (warning) => {
      const source = JSON.stringify(warning)
      const en = formatProjectWarning(warning, english.t)
      const he = formatProjectWarning(warning, hebrew.t)
      expect(en.length).toBeGreaterThan(10)
      expect(he).toMatch(/[\u0590-\u05ff]/u)
      expect(he).not.toBe(en)
      expect(he).not.toMatch(/\$\d|warning-/u)
      if (warning.value !== undefined) {
        expect(en).toContain(`\u2068${warning.value}\u2069`)
        expect(he).toContain(`\u2068${warning.value}\u2069`)
      }
      if (warning.code === 'format-newer' || warning.code === 'novel-file-unreadable') {
        expect(en).toContain('read-only')
        expect(he).toContain('לקריאה בלבד')
      }
      expect(JSON.stringify(warning)).toBe(source)
    }
  )

  it.each([
    'unreadable-file',
    'invalid-encoding',
    'unclosed-frontmatter',
    'unparseable-frontmatter',
    'unknown-type',
    'nested-project',
    'name-breaks-links'
  ] satisfies FileProblemDto['problem'][])('localizes file problem %s', (problem) => {
    const value: FileProblemDto = { path: 'מקור.md', problem, detail: 'spaceship (חללית)' }
    const en = describeFileProblem(value, english.t)
    const he = describeFileProblem(value, hebrew.t)
    expect(en).not.toBe(he)
    expect(he).toMatch(/[\u0590-\u05ff]/u)
    if (problem === 'unknown-type') expect(he).toContain('\u2068spaceship (חללית)\u2069')
  })

  it.each([
    { code: 'duplicate-chapter-order', order: 2, titles: ['יעל', 'Draft'] },
    { code: 'duplicate-part-order', order: 1, titles: ['חלק א', 'Part B'] },
    { code: 'part-without-order', titles: ['Interlude'] },
    {
      code: 'ambiguous-link',
      title: 'יעל',
      link: '[[Marrow]]',
      location: { kind: 'body' },
      choices: ['characters/Marrow.md', 'locations/Marrow.md', 'notes/Marrow.md']
    },
    {
      code: 'ambiguous-link',
      title: 'יעל',
      link: '[[Marrow]]',
      location: { kind: 'key', key: 'pov' },
      choices: ['characters/Marrow.md', 'characters/other/Marrow.md']
    },
    {
      code: 'unusable-value',
      title: 'יעל',
      reason: 'unquoted-link',
      key: 'pov',
      value: '[[Ilka]]'
    },
    { code: 'unusable-value', title: 'יעל', reason: 'not-link', key: 'pov', value: '7' },
    { code: 'unusable-value', title: 'יעל', reason: 'not-integer', key: 'order', value: '1.5' }
  ] as const)('localizes manuscript warning %j', (details) => {
    const warning = { ...details, paths: ['יעל.md'] }
    const source = JSON.stringify(warning)
    const en = formatManuscriptWarning(warning, english.t)
    const he = formatManuscriptWarning(warning, hebrew.t)
    expect(he).not.toBe(en)
    expect(he).toMatch(/[\u0590-\u05ff]/u)
    expect(he).not.toMatch(/\$\d|warning-/u)
    if (details.code === 'ambiguous-link') {
      for (const path of details.choices) {
        expect(en).toContain(`\u2068${path}\u2069`)
        expect(he).toContain(`\u2068${path}\u2069`)
      }
      expect(he).toContain('\u2068[[characters/Marrow]]\u2069')
    }
    if (details.code === 'unusable-value' && details.reason === 'unquoted-link')
      expect(he).toContain('\u2068pov: "[[Ilka]]"\u2069')
    expect(JSON.stringify(warning)).toBe(source)
  })
})
