import project from '../../../tests/fixtures/projects/salt-orchard/project.md?raw'
import { describe, expect, it } from 'vitest'
import { readFrontmatter, setFrontmatterValues, splitFrontmatter } from './frontmatter'

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
      value: { title: 'The Salt Orchard', author: 'Ines Varga', language: 'en', chapterNumbering: 'continuous', id: 'prj-7d2k9q', schemaVersion: 1, series: 'Orchard Books' },
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
    expect(setFrontmatterValues(quoted, { title: "Ilka's Will" })).toEqual({ ok: true, value: "---\ntitle: 'Ilka''s Will'\nid: ch-1\n---\nBody\n" })
  })

  it('writes Hebrew titles plainly', () => {
    expect(setFrontmatterValues('---\ntitle: Old\n---\n', { title: 'המעבר' })).toEqual({ ok: true, value: '---\ntitle: המעבר\n---\n' })
  })

  it('adds a missing key at the end of the frontmatter, in the file\'s line endings', () => {
    expect(setFrontmatterValues('---\r\ntitle: X\r\n---\r\nBody\r\n', { id: 'ch-k3f9q2' })).toEqual({ ok: true, value: '---\r\ntitle: X\r\nid: ch-k3f9q2\r\n---\r\nBody\r\n' })
  })

  it('creates frontmatter when a file has none', () => {
    expect(setFrontmatterValues('Prose.\n', { title: 'Frost', id: 'ch-1' })).toEqual({ ok: true, value: '---\ntitle: Frost\nid: ch-1\n---\nProse.\n' })
  })

  it('refuses invalid YAML rather than repairing it without asking', () => {
    expect(setFrontmatterValues('---\ntitle: [unclosed\n---\n', { title: 'X' })).toEqual({ ok: false, error: 'invalid-yaml' })
  })

  it('refuses to replace a value that is a list or a map', () => {
    expect(setFrontmatterValues('---\ntitle:\n  - a\n---\n', { title: 'X' })).toEqual({ ok: false, error: 'not-a-plain-value' })
  })
})
