import theCrossing from '../../../tests/fixtures/projects/salt-orchard/manuscript/the-crossing.md?raw'
import looseIdeas from '../../../tests/fixtures/projects/salt-orchard/notes/loose-ideas.md?raw'
import mainStory from '../../../tests/fixtures/projects/salt-orchard/outlines/main-story.md?raw'
import { describe, expect, it } from 'vitest'
import { locateLinks, rewriteLinksTo } from './links'

const FROM = 'manuscript/the-crossing.md'

describe('rewriteLinksTo: every link to a renamed file, and nothing else', () => {
  it('rewrites inline, reference and wiki links, keeping fragments, aliases and titles', () => {
    const { text, count } = rewriteLinksTo(looseIdeas, 'notes', FROM, 'manuscript/01 crossing.md', { wikilinkNameIsUnique: true })
    expect(count).toBe(5)
    expect(text).toBe(
      looseIdeas
        .replace('[The Crossing](../manuscript/the-crossing.md#the-ferry)', '[The Crossing](<../manuscript/01 crossing.md#the-ferry>)')
        .replace(
          '[[the-crossing]], [[the-crossing|the first chapter]] and [[the-crossing#The ferry]]',
          '[[01 crossing]], [[01 crossing|the first chapter]] and [[01 crossing#The ferry]]',
        )
        .replace('[c]: ../manuscript/the-crossing.md', '[c]: <../manuscript/01 crossing.md>'),
    )
  })

  it('leaves similar names and code alone', () => {
    const { text } = rewriteLinksTo(looseIdeas, 'notes', FROM, 'manuscript/crossing.md', { wikilinkNameIsUnique: true })
    expect(text).toContain('[crossing notes](crossing-notes.md)')
    expect(text).toContain('`[x](../manuscript/the-crossing.md)`')
  })

  it('leaves [[wikilinks]] alone when another file has the same name, because they might mean that one', () => {
    const { text, count } = rewriteLinksTo(looseIdeas, 'notes', FROM, 'manuscript/crossing.md', { wikilinkNameIsUnique: false })
    expect(count).toBe(2)
    expect(text).toContain('[[the-crossing]]')
  })

  it('rewrites a full-path wikilink whatever the names elsewhere', () => {
    expect(
      rewriteLinksTo('See [[manuscript/the-crossing]].\n', '', FROM, 'manuscript/crossing.md', { wikilinkNameIsUnique: false }).text,
    ).toBe('See [[manuscript/crossing]].\n')
  })

  it('keeps link titles and relative paths from other folders', () => {
    const { text, count } = rewriteLinksTo(mainStory, 'outlines', FROM, 'manuscript/crossing.md', { wikilinkNameIsUnique: true })
    expect(count).toBe(2)
    expect(text).toContain('[the crossing](../manuscript/crossing.md "first chapter")')
  })

  it('fixes links between chapters in the same folder', () => {
    const { text } = rewriteLinksTo(theCrossing, 'manuscript', 'manuscript/the-orchard-gate.md', 'manuscript/gate.md', {
      wikilinkNameIsUnique: true,
    })
    expect(text).toContain('See also [the gate](gate.md).')
  })

  it('keeps percent-encoding when the original link used it', () => {
    expect(
      rewriteLinksTo('[x](../manuscript/the%20crossing.md)\n', 'notes', 'manuscript/the crossing.md', 'manuscript/new name.md', {
        wikilinkNameIsUnique: true,
      }).text,
    ).toBe('[x](../manuscript/new%20name.md)\n')
  })

  it('changes nothing in a file without links to it', () => {
    expect(rewriteLinksTo('# Nothing here\n', '', FROM, 'manuscript/x.md', { wikilinkNameIsUnique: true })).toEqual({
      text: '# Nothing here\n',
      count: 0,
    })
  })
})

describe('locateLinks: where each link is', () => {
  it('gives the line each link starts on, with CRLF line endings too', () => {
    const text = '---\ntitle: Bea\n---\nAunt of [Ilka](ilka.md).\r\n\r\n- Waits at [[Ferry Landing]]\n\n`[not](a-link.md)`\n'
    expect(locateLinks(text, 'characters')).toEqual([
      { link: { kind: 'path', target: 'characters/ilka.md', text: 'Ilka' }, line: 4 },
      { link: { kind: 'wiki', name: 'Ferry Landing', text: null }, line: 6 },
    ])
  })
})
