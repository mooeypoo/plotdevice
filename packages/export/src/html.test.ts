import { readChapterForExport } from '@plotdevice/markdown'
import { describe, expect, it } from 'vitest'
import { blocksToHtml, escapeXml, safeUrl } from './html'

describe('chapter text as XHTML', () => {
  it('escapes the author’s text, so nothing in it becomes markup', () => {
    expect(blocksToHtml(readChapterForExport('A <script>alert(1)</script> & "quotes"\n'), 'ltr', 1)).toBe(
      '<p>A &lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;quotes&quot;</p>',
    )
  })

  it('links only web and email addresses', () => {
    expect(safeUrl('https://example.org')).toBe('https://example.org')
    expect(safeUrl('mailto:ines@example.org')).toBe('mailto:ines@example.org')
    expect(safeUrl('javascript:alert(1)')).toBeNull()
    expect(safeUrl('file:///etc/passwd')).toBeNull()
    expect(safeUrl('../world/ilka.md')).toBeNull()
    expect(blocksToHtml(readChapterForExport('[Ilka](../world/ilka.md) and [site](https://x.org/?a=1&b=2)\n'), 'ltr', 1)).toBe(
      '<p>Ilka and <a href="https://x.org/?a=1&amp;b=2">site</a></p>',
    )
  })

  it('marks a paragraph’s direction only where it differs from the book’s, and always marks phrases', () => {
    const blocks = readChapterForExport('אינס קראה.\n\n::: {dir=ltr}\nThe letter.\n:::\n\nנואל ענה: [It was never]{dir=ltr} ושתק.\n')
    expect(blocksToHtml(blocks, 'rtl', 1)).toBe(
      ['<p>אינס קראה.</p>', '<p dir="ltr">The letter.</p>', '<p>נואל ענה: <span dir="ltr">It was never</span> ושתק.</p>'].join('\n'),
    )
  })

  it('writes scene breaks, quotes, lists and headings one level below the chapter’s', () => {
    const blocks = readChapterForExport('## Inside\n\n* * *\n\n> *Said*\n\n3. three\n4. four\n\n###### Deep\n')
    expect(blocksToHtml(blocks, 'ltr', 1)).toBe(
      [
        '<h3>Inside</h3>',
        '<p class="scene-break" role="separator">* * *</p>',
        '<blockquote><p><em>Said</em></p></blockquote>',
        '<ol start="3"><li><p>three</p></li><li><p>four</p></li></ol>',
        '<h6>Deep</h6>',
      ].join('\n'),
    )
  })

  it('escapes apostrophes too, for attribute safety', () => {
    expect(escapeXml("Ines's")).toBe('Ines&#39;s')
  })
})
