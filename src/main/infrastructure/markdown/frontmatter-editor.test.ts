import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseDocument } from 'yaml'
import { editFrontmatter, type KeyEdit } from './frontmatter-editor'
import { splitMarkdownFile, type MarkdownFileParts } from './markdown-file'

function partsOf(text: string): MarkdownFileParts {
  const split = splitMarkdownFile(new TextEncoder().encode(text))
  if (split.kind !== 'parts') throw new Error('test setup: no parts')
  return split.parts
}

function edit(text: string, ...edits: KeyEdit[]): string {
  const result = editFrontmatter(partsOf(text), edits)
  if (!result.ok) throw new Error(result.error.code)
  return `${result.value.head}${result.value.body}`
}

const sample = [
  '---',
  'type: chapter',
  'title: The Ferry               # optional',
  'part: "[[Part One]]"   # which part',
  'order: 2',
  'pov:',
  'characters:',
  '  - "[[Ilka Szabó]]"   # first',
  '  - "[[Aunt Bea]]"',
  'threads: [main, strike]',
  'mood: tense                 # unknown key',
  '---',
  'Body text stays.',
  ''
].join('\n')

describe('editFrontmatter: replacing values', () => {
  it('replaces a plain value and keeps the comment and its spacing', () => {
    expect(edit(sample, { key: 'title', value: 'The Crossing' })).toBe(
      sample.replace(
        'title: The Ferry               # optional',
        'title: The Crossing               # optional'
      )
    )
  })

  it('keeps double quotes, and always quotes wikilinks', () => {
    expect(edit(sample, { key: 'part', value: '[[Part Two]]' })).toBe(
      sample.replace('part: "[[Part One]]"', 'part: "[[Part Two]]"')
    )
  })

  it('writes numbers plainly', () => {
    expect(edit(sample, { key: 'order', value: 5 })).toBe(sample.replace('order: 2', 'order: 5'))
  })

  it('fills an empty value', () => {
    expect(edit(sample, { key: 'pov', value: '[[Ilka Szabó]]' })).toBe(
      sample.replace('pov:\n', 'pov: "[[Ilka Szabó]]"\n')
    )
  })

  it('rewrites a block list in place, keeping its indentation', () => {
    expect(
      edit(sample, { key: 'characters', value: ['[[Noël]]', '[[יעל]]', '[[Aunt Bea]]'] })
    ).toBe(
      sample.replace(
        'characters:\n  - "[[Ilka Szabó]]"   # first\n  - "[[Aunt Bea]]"\n',
        'characters:\n  - "[[Noël]]"\n  - "[[יעל]]"\n  - "[[Aunt Bea]]"\n'
      )
    )
  })

  it('keeps a flow list as a flow list', () => {
    expect(edit(sample, { key: 'threads', value: ['main'] })).toBe(
      sample.replace('threads: [main, strike]', 'threads: [main]')
    )
  })

  it('turns a single value into a block list when it becomes a list', () => {
    const text = '---\nlocation: "[[Marrow]]"   # where\nstatus: draft\n---\n'
    expect(edit(text, { key: 'location', value: ['[[Marrow]]', '[[The Mill]]'] })).toBe(
      '---\nlocation:\n  - "[[Marrow]]"\n  - "[[The Mill]]"   # where\nstatus: draft\n---\n'
    )
  })

  it('turns a block list into a single value', () => {
    expect(edit(sample, { key: 'characters', value: '[[Noël]]' })).toBe(
      sample.replace(
        'characters:\n  - "[[Ilka Szabó]]"   # first\n  - "[[Aunt Bea]]"\n',
        'characters: "[[Noël]]"\n'
      )
    )
  })

  it('replaces a folded block scalar with a single-line value', () => {
    const text = '---\nsynopsis: >-\n  folded\n  text\nstatus: draft\n---\n'
    expect(edit(text, { key: 'synopsis', value: 'New summary.' })).toBe(
      '---\nsynopsis: New summary.\nstatus: draft\n---\n'
    )
  })

  it('writes multi-line text on one line, escaped', () => {
    const result = edit(sample, { key: 'mood', value: 'line one\nline two' })
    expect(result).toContain('mood: "line one\\nline two"                 # unknown key')
  })

  it('quotes text that YAML would read as something else', () => {
    expect(edit(sample, { key: 'title', value: '1984' })).toContain('title: "1984"')
    expect(edit(sample, { key: 'title', value: 'yes: no' })).toContain('title: "yes: no"')
    expect(edit(sample, { key: 'title', value: 'בוקר במטע' })).toContain('title: בוקר במטע')
  })
})

describe('editFrontmatter: adding and removing keys', () => {
  it('adds a key as one line before the closing ---', () => {
    expect(edit(sample, { key: 'status', value: 'draft' })).toBe(
      sample.replace(
        'mood: tense                 # unknown key\n',
        'mood: tense                 # unknown key\nstatus: draft\n'
      )
    )
  })

  it('adds a list key as a block list', () => {
    expect(edit('---\ntype: chapter\n---\n', { key: 'characters', value: ['[[Noël]]'] })).toBe(
      '---\ntype: chapter\ncharacters:\n  - "[[Noël]]"\n---\n'
    )
  })

  it('adds a key to an empty block', () => {
    expect(edit('---\n---\nBody\n', { key: 'type', value: 'chapter' })).toBe(
      '---\ntype: chapter\n---\nBody\n'
    )
  })

  it('removes a key, its comment, and a block list’s lines', () => {
    expect(edit(sample, { key: 'title', value: undefined })).toBe(
      sample.replace('title: The Ferry               # optional\n', '')
    )
    expect(edit(sample, { key: 'characters', value: undefined })).toBe(
      sample.replace('characters:\n  - "[[Ilka Szabó]]"   # first\n  - "[[Aunt Bea]]"\n', '')
    )
  })

  it('does nothing when removing a key that is not there', () => {
    expect(edit(sample, { key: 'synopsis', value: undefined })).toBe(sample)
  })

  it('applies several edits in order', () => {
    const result = edit(sample, { key: 'order', value: 1 }, { key: 'status', value: 'revised' })
    expect(result).toContain('order: 1\n')
    expect(result).toContain('status: revised\n---')
  })
})

describe('editFrontmatter: preserving the file', () => {
  it('uses CRLF for new lines in a CRLF file', () => {
    const text = '---\r\ntype: chapter\r\norder: 2   # c\r\n---\r\nBody\r\n'
    const result = edit(
      text,
      { key: 'order', value: 3 },
      { key: 'characters', value: ['[[A]]', '[[B]]'] }
    )
    expect(result).toBe(
      '---\r\ntype: chapter\r\norder: 3   # c\r\ncharacters:\r\n  - "[[A]]"\r\n  - "[[B]]"\r\n---\r\nBody\r\n'
    )
  })

  it('never touches the body', () => {
    const result = editFrontmatter(partsOf(sample), [{ key: 'order', value: 9 }])
    expect(result.ok && result.value.body).toBe('Body text stays.\n')
  })

  it('refuses files without frontmatter, or with unparseable frontmatter', () => {
    expect(editFrontmatter(partsOf('Just prose.\n'), [{ key: 'a', value: 'b' }])).toMatchObject({
      ok: false,
      error: { code: 'no-frontmatter' }
    })
    expect(
      editFrontmatter(partsOf('---\ntitle: "unclosed\n---\n'), [{ key: 'a', value: 'b' }])
    ).toMatchObject({ ok: false, error: { code: 'unparseable-frontmatter' } })
  })

  it('refuses lists of mappings, which it can’t rewrite safely', () => {
    const text = '---\nrelationships:\n  - with: "[[A]]"\n    kind: mentor\n---\n'
    expect(editFrontmatter(partsOf(text), [{ key: 'relationships', value: ['x'] }])).toMatchObject({
      ok: false,
      error: { code: 'unsupported-value' }
    })
    expect(editFrontmatter(partsOf(text), [{ key: 'relationships', value: 'x' }])).toMatchObject({
      ok: false,
      error: { code: 'unsupported-value' }
    })
  })

  it('quotes an unquoted link, which YAML read as a list in a list', () => {
    const text = '---\npov: [[Ilka Szabó]]   # she narrates\ncharacters:\n  - [[Aunt Bea]]\n---\n'
    expect(
      editFrontmatter(partsOf(text), [
        { key: 'pov', value: '[[Ilka Szabó]]' },
        { key: 'characters', value: ['[[Aunt Bea]]'] }
      ])
    ).toMatchObject({
      ok: true,
      value: {
        head: '---\npov: "[[Ilka Szabó]]"   # she narrates\ncharacters:\n  - "[[Aunt Bea]]"\n---\n'
      }
    })
  })
})

describe('editFrontmatter on every fixture file', () => {
  const fixture = join(import.meta.dirname, '../../../../fixtures/sample-novel')
  const files = readdirSync(fixture, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => relative(fixture, join(entry.parentPath, entry.name)))
    .filter((path) => {
      const split = splitMarkdownFile(readFileSync(join(fixture, path)))
      if (split.kind !== 'parts' || split.parts.head === '') return false
      const yaml = split.parts.head.replace(/^---\r?\n/u, '').replace(/---\r?\n?$/u, '')
      return parseDocument(yaml).errors.length === 0
    })
    .sort()

  const edits: KeyEdit[][] = [
    [{ key: 'title', value: 'A New Title' }],
    [{ key: 'order', value: 7 }],
    [{ key: 'status', value: undefined }],
    [{ key: 'characters', value: ['[[Noël]]', '[[יעל]]'] }],
    [{ key: 'synopsis', value: 'Rewritten: with a colon.' }]
  ]

  it.each(files)('changes only the edited key in %s', (path) => {
    const bytes = readFileSync(join(fixture, path))
    const parts = partsOf(new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes))
    for (const editSet of edits) {
      const result = editFrontmatter(parts, editSet)
      expect(result.ok).toBe(true)
      if (!result.ok) continue
      // The body and BOM are untouched; line endings in the head stay as they were.
      expect(result.value.body).toBe(parts.body)
      expect(result.value.hasBom).toBe(parts.hasBom)
      const crlfBefore = parts.head.includes('\r\n')
      const lfOnlyBefore = !parts.head.replace(/\r\n/gu, '').includes('\n')
      if (crlfBefore && lfOnlyBefore) {
        expect(result.value.head.replace(/\r\n/gu, '')).not.toContain('\n')
      }
      if (!crlfBefore) expect(result.value.head).not.toContain('\r')
      // Every comment line survives.
      for (const line of parts.head.split(/\r?\n/u).filter((l) => l.trimStart().startsWith('#'))) {
        expect(result.value.head).toContain(line)
      }
    }
  })
})
