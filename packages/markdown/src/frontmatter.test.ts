import project from '../../../tests/fixtures/projects/salt-orchard/project.md?raw'
import { describe, expect, it } from 'vitest'
import { readFrontmatter, setFrontmatterBlock, setFrontmatterList, setFrontmatterValues, splitFrontmatter } from './frontmatter'

describe('splitFrontmatter', () => {
  it('separates frontmatter from the body, keeping both exactly', () => {
    const { frontmatter, body } = splitFrontmatter(project)
    expect(frontmatter?.text.startsWith('---\ntitle: The Salt Orchard\n')).toBe(true)
    expect(frontmatter?.text.endsWith('---\n')).toBe(true)
    expect(body).toBe('Notes the author keeps about the project. The app never rewrites this text.\n')
    expect((frontmatter?.text ?? '') + body).toBe(project)
  })

  it('handles CRLF and a file without frontmatter', () => {
    const crlf = '---\r\ntitle: X\r\n---\r\nBody\r\n'
    expect(splitFrontmatter(crlf).body).toBe('Body\r\n')
    expect(splitFrontmatter('Just prose.\n')).toEqual({ frontmatter: null, body: 'Just prose.\n' })
  })

  it('does not mistake a scene break for frontmatter when it is not on the first line', () => {
    expect(splitFrontmatter('Prose.\n\n---\n\nMore.\n').frontmatter).toBeNull()
  })
})

describe('readFrontmatter', () => {
  it('reads values, including unknown keys', () => {
    expect(readFrontmatter(project)).toEqual({
      ok: true,
      value: {
        title: 'The Salt Orchard',
        author: 'Ines Varga',
        language: 'en',
        chapterNumbering: 'continuous',
        id: 'prj-7d2k9q',
        schemaVersion: 1,
        series: 'Orchard Books',
      },
    })
  })

  it('reports invalid YAML instead of guessing', () => {
    expect(readFrontmatter('---\ntitle: [unclosed\n---\nBody\n')).toEqual({ ok: false, error: 'invalid-yaml' })
  })

  it('reads a file without frontmatter as empty', () => {
    expect(readFrontmatter('Body\n')).toEqual({ ok: true, value: {} })
  })
})

describe('setFrontmatterValues: splices, never re-serializes (ADR 0005)', () => {
  it('changes one value and leaves every other byte, comment and key order alone', () => {
    const result = setFrontmatterValues(project, { title: 'The Salt Orchard: A Novel' })
    expect(result).toEqual({ ok: true, value: project.replace('title: The Salt Orchard\n', 'title: "The Salt Orchard: A Novel"\n') })
  })

  it('keeps the quoting style a value already had', () => {
    const quoted = "---\ntitle: 'Old'\nid: ch-1\n---\nBody\n"
    expect(setFrontmatterValues(quoted, { title: "Ilka's Will" })).toEqual({
      ok: true,
      value: "---\ntitle: 'Ilka''s Will'\nid: ch-1\n---\nBody\n",
    })
  })

  it('writes Hebrew titles plainly', () => {
    expect(setFrontmatterValues('---\ntitle: Old\n---\n', { title: 'המעבר' })).toEqual({ ok: true, value: '---\ntitle: המעבר\n---\n' })
  })

  it("adds a missing key at the end of the frontmatter, in the file's line endings", () => {
    expect(setFrontmatterValues('---\r\ntitle: X\r\n---\r\nBody\r\n', { id: 'ch-k3f9q2' })).toEqual({
      ok: true,
      value: '---\r\ntitle: X\r\nid: ch-k3f9q2\r\n---\r\nBody\r\n',
    })
  })

  it('creates frontmatter when a file has none', () => {
    expect(setFrontmatterValues('Prose.\n', { title: 'Frost', id: 'ch-1' })).toEqual({
      ok: true,
      value: '---\ntitle: Frost\nid: ch-1\n---\nProse.\n',
    })
  })

  it('refuses invalid YAML rather than repairing it without asking', () => {
    expect(setFrontmatterValues('---\ntitle: [unclosed\n---\n', { title: 'X' })).toEqual({ ok: false, error: 'invalid-yaml' })
  })

  it('refuses to replace a value that is a list or a map', () => {
    expect(setFrontmatterValues('---\ntitle:\n  - a\n---\n', { title: 'X' })).toEqual({ ok: false, error: 'not-a-plain-value' })
  })
})

describe('setFrontmatterList: replaces only the lines of the list (ADR 0005)', () => {
  const page = '---\ntitle: Noël # the ferryman\naka: [Noël]\nmood: calm\n---\nBody\n'

  it('adds the list at the end of the frontmatter, and leaves everything else alone', () => {
    expect(setFrontmatterList(page, 'tags', ['Marrow folk', 'Part Two – main'])).toEqual({
      ok: true,
      value: page.replace('mood: calm\n', 'mood: calm\ntags: [Marrow folk, Part Two – main]\n'),
    })
  })

  it('replaces a flow list or a block list in place, and removes the key when the list is empty', () => {
    const flow = '---\ntitle: X\ntags: [a, b] # mine\nid: 1\n---\n'
    expect(setFrontmatterList(flow, 'tags', ['a'])).toEqual({ ok: true, value: '---\ntitle: X\ntags: [a]\nid: 1\n---\n' })
    const block = '---\ntitle: X\ntags:\n  - a\n  - Part Two: main\nid: 1\n---\n'
    expect(setFrontmatterList(block, 'tags', ['a', 'Part Two: main'])).toEqual({
      ok: true,
      value: '---\ntitle: X\ntags: [a, "Part Two: main"]\nid: 1\n---\n',
    })
    expect(setFrontmatterList(block, 'tags', [])).toEqual({ ok: true, value: '---\ntitle: X\nid: 1\n---\n' })
    expect(setFrontmatterList('---\ntags:\ntitle: X\n---\n', 'tags', ['a'])).toEqual({ ok: true, value: '---\ntags: [a]\ntitle: X\n---\n' })
  })

  it('quotes only what a flow list needs, and keeps CRLF', () => {
    const crlf = '---\r\ntitle: X\r\n---\r\nBody\r\n'
    expect(setFrontmatterList(crlf, 'tags', ['a, b', '[draft]', 'יעל', 'true', '#1'])).toEqual({
      ok: true,
      value: '---\r\ntitle: X\r\ntags: ["a, b", "[draft]", יעל, "true", "#1"]\r\n---\r\nBody\r\n',
    })
  })

  it('gives a page without frontmatter one, and changes nothing when there is nothing to remove', () => {
    expect(setFrontmatterList('Body\n', 'tags', ['a'])).toEqual({ ok: true, value: '---\ntags: [a]\n---\nBody\n' })
    expect(setFrontmatterList('Body\n', 'tags', [])).toEqual({ ok: true, value: 'Body\n' })
    expect(setFrontmatterList(page, 'tags', [])).toEqual({ ok: true, value: page })
  })

  it('refuses invalid YAML instead of guessing', () => {
    expect(setFrontmatterList('---\ntitle: [unclosed\n---\n', 'tags', ['a'])).toEqual({ ok: false, error: 'invalid-yaml' })
  })

  it('writes what it reads back', () => {
    const tags = ['Part One: Arrival – secondary', 'a, b', "Bea's", '"quoted"', 'משפחה']
    const written = setFrontmatterList(page, 'tags', tags)
    expect(written.ok && readFrontmatter(written.value)).toMatchObject({ ok: true, value: { tags } })
  })
})

describe('setFrontmatterBlock: replaces only the lines of one key (ADR 0011)', () => {
  const kinds = ['kinds:', '  - folder: characters', '    one: NPC', '    many: NPCs', '  - folder: פלגים']

  it('adds the key at the end of the frontmatter, keeping comments and other keys', () => {
    const result = setFrontmatterBlock(project, 'kinds', kinds)
    expect(result.ok).toBe(true)
    const text = result.ok ? result.value : ''
    expect(text).toContain(
      '# Written by hand; the app must keep this comment and the key below.\nseries: Orchard Books\nkinds:\n  - folder: characters\n    one: NPC\n    many: NPCs\n  - folder: פלגים\n---\n',
    )
    expect(text.replace(/kinds:[\s\S]*?(?=---\n)/, '')).toBe(project)
  })

  it('replaces the key where it is, whatever form it had', () => {
    const before = '---\ntitle: A\nkinds: [{folder: npcs}]\nlanguage: en\n---\nBody.\n'
    expect(setFrontmatterBlock(before, 'kinds', ['kinds:', '  - folder: npcs', '    one: NPC'])).toEqual({
      ok: true,
      value: '---\ntitle: A\nkinds:\n  - folder: npcs\n    one: NPC\nlanguage: en\n---\nBody.\n',
    })
    const block = '---\ntitle: A\nkinds:\n  - folder: npcs # mine\n    one: NPC\nlanguage: en\n---\n'
    expect(setFrontmatterBlock(block, 'kinds', ['kinds:', '  - folder: npcs'])).toEqual({
      ok: true,
      value: '---\ntitle: A\nkinds:\n  - folder: npcs\nlanguage: en\n---\n',
    })
  })

  it('keeps a comment that belongs to the next key', () => {
    const before = '---\nkinds:\n  - folder: npcs\n# the series, by hand\nseries: Orchard\n---\n'
    expect(setFrontmatterBlock(before, 'kinds', ['kinds:', '  - folder: lore'])).toEqual({
      ok: true,
      value: '---\nkinds:\n  - folder: lore\n# the series, by hand\nseries: Orchard\n---\n',
    })
  })

  it('removes the key when given nothing', () => {
    const block = '---\ntitle: A\nmanuscriptUnit:\n  one: Session\n  many: Sessions\nlanguage: en\n---\n'
    expect(setFrontmatterBlock(block, 'manuscriptUnit', null)).toEqual({ ok: true, value: '---\ntitle: A\nlanguage: en\n---\n' })
    expect(setFrontmatterBlock('---\ntitle: A\n---\n', 'kinds', null)).toEqual({ ok: true, value: '---\ntitle: A\n---\n' })
  })

  it('keeps Windows line endings', () => {
    expect(
      setFrontmatterBlock('---\r\ntitle: A\r\n---\r\nBody.\r\n', 'manuscriptUnit', [
        'manuscriptUnit:',
        '  one: Session',
        '  many: Sessions',
      ]),
    ).toEqual({
      ok: true,
      value: '---\r\ntitle: A\r\nmanuscriptUnit:\r\n  one: Session\r\n  many: Sessions\r\n---\r\nBody.\r\n',
    })
  })

  it('never rewrites frontmatter it can’t read', () => {
    expect(setFrontmatterBlock('---\ntitle: [unclosed\n---\n', 'kinds', kinds)).toEqual({ ok: false, error: 'invalid-yaml' })
  })
})
