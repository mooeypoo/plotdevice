import { describe, expect, it } from 'vitest'
import { readFrontmatter } from './frontmatter'
import { newChapterFile, newContentsFile, newOutlineFile, newProjectFile } from './new-files'

describe('new files, exactly as DOMAIN_AND_FILE_FORMAT.md shows them', () => {
  it('project.md', () => {
    expect(
      newProjectFile({
        title: 'The Salt Orchard',
        author: 'Ines Varga',
        language: 'he',
        chapterNumbering: 'continuous',
        id: 'prj-7d2k9q',
        schemaVersion: 1,
      }),
    ).toBe(
      '---\ntitle: The Salt Orchard\nauthor: Ines Varga\nlanguage: he\nchapterNumbering: continuous\nid: prj-7d2k9q\nschemaVersion: 1\n---\n',
    )
  })

  it('project.md without an author, with a title that needs quoting', () => {
    const text = newProjectFile({ title: 'Salt: A Novel', language: 'en', chapterNumbering: 'continuous', id: 'prj-1', schemaVersion: 1 })
    expect(text).toBe('---\ntitle: "Salt: A Novel"\nlanguage: en\nchapterNumbering: continuous\nid: prj-1\nschemaVersion: 1\n---\n')
    expect(readFrontmatter(text)).toMatchObject({ ok: true, value: { title: 'Salt: A Novel' } })
  })

  it('CONTENTS.md starts with the title only', () => {
    expect(newContentsFile('מטע המלח')).toBe('# מטע המלח\n')
    expect(newContentsFile('# Hash title')).toBe('# \\# Hash title\n')
  })

  it('a chapter, with an optional first text', () => {
    expect(newChapterFile('The Crossing', 'ch-k3f9q2')).toBe('---\ntitle: The Crossing\nid: ch-k3f9q2\n---\n')
    expect(newChapterFile('Frost', 'ch-1', 'It began.\n')).toBe('---\ntitle: Frost\nid: ch-1\n---\nIt began.\n')
  })
})

describe('a new outline', () => {
  it('is just its title, or starts with a link to the page it is about', () => {
    expect(newOutlineFile('Main story')).toBe('# Main story\n')
    expect(newOutlineFile('Bea’s arc', { path: '../characters/bea-halmi.md', title: 'Bea Halmi' })).toBe(
      '# Bea’s arc\n\n[Bea Halmi](../characters/bea-halmi.md)\n',
    )
    expect(newOutlineFile('הקשת של יעל', { path: '../characters/my yael.md', title: 'יעל [צעירה]' })).toBe(
      '# הקשת של יעל\n\n[יעל \\[צעירה\\]](<../characters/my yael.md>)\n',
    )
  })
})
