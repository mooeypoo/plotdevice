import { describe, expect, it } from 'vitest'
import type { WikiLink } from '../../shared-kernel/wiki-link'
import { rewriteFrontmatterLinks } from './frontmatter-link-rewriter'

const renameMarrow =
  (onlyKey?: string) =>
  (link: WikiLink, key: string): string | undefined =>
    link.target === 'Marrow' && (onlyKey === undefined || key === onlyKey)
      ? '[[Marrow Village]]'
      : undefined

describe('rewriteFrontmatterLinks', () => {
  it('replaces only the link characters, keeping comments, quotes, and CRLF', () => {
    const head = '---\r\ntype: chapter\r\nlocation: "[[Marrow]]"  # the village\r\n---\r\n'
    expect(rewriteFrontmatterLinks(head, renameMarrow())).toEqual({
      kind: 'rewritten',
      head: '---\r\ntype: chapter\r\nlocation: "[[Marrow Village]]"  # the village\r\n---\r\n',
      count: 1
    })
  })

  it('tells each decision which key the link is under', () => {
    const head = '---\npov: "[[Marrow]]"\nlocation:\n  - "[[Marrow]]"\n---\n'
    const result = rewriteFrontmatterLinks(head, renameMarrow('location'))
    expect(result).toEqual({
      kind: 'rewritten',
      head: '---\npov: "[[Marrow]]"\nlocation:\n  - "[[Marrow Village]]"\n---\n',
      count: 1
    })
  })

  it('never touches links in comments', () => {
    const head = '---\n# see [[Marrow]]\ntitle: x\n---\n'
    expect(rewriteFrontmatterLinks(head, renameMarrow())).toEqual({
      kind: 'rewritten',
      head,
      count: 0
    })
  })

  it('refuses a rewrite that would change other values', () => {
    const head = "---\nlocation: '[[Marrow]]'\n---\n"
    const quote = (): string => "[[Bea's]]"
    expect(rewriteFrontmatterLinks(head, quote)).toEqual({ kind: 'unsafe' })
  })

  it('leaves unparseable frontmatter alone', () => {
    expect(rewriteFrontmatterLinks('---\na: [\n---\n', renameMarrow())).toEqual({
      kind: 'unparseable'
    })
  })
})
