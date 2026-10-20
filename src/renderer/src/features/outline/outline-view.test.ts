// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { createOutlineView, renderOutlineMarkdown } from './outline-view'

const targets = [{ name: 'The Ferry', path: 'The Ferry.md', type: 'chapter' as const }]

describe('rendered outline', () => {
  it('renders headings, nested lists, emphasis, quotes, code, and tables instead of raw marks', () => {
    const host = document.createElement('div')
    host.innerHTML = renderOutlineMarkdown(
      '# Plan\n\n- **First**\n  - *Second*\n\n> A question\n\n`code`\n\n| Clue | Who |\n| --- | --- |\n| Key | Bea |',
      targets,
      () => false
    )
    expect(host.querySelector('h1')?.textContent).toBe('Plan')
    expect(host.querySelector('li strong')?.textContent).toBe('First')
    expect(host.querySelector('li li em')?.textContent).toBe('Second')
    expect(host.querySelector('blockquote')?.textContent).toContain('A question')
    expect(host.querySelector('code')?.textContent).toBe('code')
    expect(host.querySelector('td')?.textContent).toBe('Key')
  })

  it('opens wiki and relative Markdown links by mouse or keyboard activation', () => {
    const host = document.createElement('div')
    const open = vi.fn()
    const view = createOutlineView(host, {
      text: '- [[The Ferry|Arrival]]\n- [Debt](../First%20frost.md)',
      linkTargets: targets,
      onOpenLink: open
    })
    const anchors = host.querySelectorAll('a')
    expect(anchors[0]?.textContent).toBe('Arrival')
    anchors[0]?.click()
    anchors[1]?.click()
    expect(open.mock.calls).toEqual([
      [{ kind: 'wiki', target: 'The Ferry' }],
      [{ kind: 'markdown', address: '../First%20frost.md' }]
    ])
    view.destroy()
    expect(host.childElementCount).toBe(0)
  })

  it('highlights linked passages, not code, and updates text and target styles', () => {
    const host = document.createElement('div')
    const view = createOutlineView(host, {
      text: '- [[The Ferry]]\n- `[[The Ferry]]`\n\n```\n[[The Ferry]]\n```',
      linkTargets: [],
      onOpenLink: vi.fn()
    })
    view.highlight((link) => link.kind === 'wiki' && link.target === 'The Ferry')
    expect(host.querySelectorAll('.outline-current')).toHaveLength(1)
    expect(host.querySelector('.outline-current')?.tagName).toBe('LI')
    expect(host.querySelector('.outline-link-missing')).not.toBeNull()
    view.setLinkTargets(targets)
    expect(host.querySelector('.outline-link-chapter')).not.toBeNull()
    view.setText('A different plan.')
    expect(host.textContent).toContain('A different plan.')
    expect(host.querySelector('.outline-current')).toBeNull()
    view.destroy()
  })

  it('keeps HTML, unsafe URLs, external links, and images inert', () => {
    const host = document.createElement('div')
    host.innerHTML = renderOutlineMarkdown(
      '<img src=x onerror="alert(1)">\n\n[bad](javascript:alert(1))\n\n[web](https://example.com)\n\n[network](//example.com)\n\n![remote](https://example.com/track.png)\n\n[[The Ferry|<script>bad</script>]]',
      targets,
      () => false
    )
    expect(host.querySelector('img, script, iframe')).toBeNull()
    expect(host.querySelectorAll('a')).toHaveLength(1)
    expect(host.querySelector('a')?.textContent).toBe('<script>bad</script>')
    expect(host.querySelector('span[title="https://example.com"]')?.textContent).toBe('web')
  })

  it('does not create nested links from wikilinks inside Markdown labels', () => {
    const html = renderOutlineMarkdown(
      '[[The Ferry]] and [see [[The Ferry]]](Other.md)',
      targets,
      () => false
    )
    const host = document.createElement('div')
    host.innerHTML = html
    expect(host.querySelector('a a')).toBeNull()
  })
})
