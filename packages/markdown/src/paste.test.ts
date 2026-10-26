import { describe, expect, it } from 'vitest'
import { htmlToMarkdown, pastedMarkdown } from './paste'

describe('pasting formatted text as Markdown (ADR 0004)', () => {
  it('keeps italic and bold from Word, and drops Word markup', () => {
    const word = `<html xmlns:o="urn:schemas-microsoft-com:office:office"><body><!--StartFragment--><p class=MsoNormal><span style='font-family:"Georgia",serif'>Ilka read the will <i>twice</i>, then <b>tore it</b>.<o:p></o:p></span></p><p class=MsoNormal style='margin-left:.5in'><span style='mso-bidi-font-family:Arial'>Bea said nothing.<o:p></o:p></span></p><!--EndFragment--></body></html>`
    expect(htmlToMarkdown(word)).toBe('Ilka read the will *twice*, then **tore it**.\n\nBea said nothing.\n')
  })

  it('keeps formatting in Hebrew text from Word', () => {
    const word = `<p class=MsoNormal dir=RTL style='text-align:right;direction:rtl;unicode-bidi:embed'><span lang=HE>יעל אמרה <b>לא</b>, ו<i>ילקה</i> שתקה.</span></p>`
    expect(htmlToMarkdown(word)).toBe('יעל אמרה **לא**, ו*ילקה* שתקה.\n')
  })

  it("reads Google Docs' styles: its bold wrapper is not bold, its styled spans are", () => {
    const docs = `<meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-1a2b3c"><p dir="ltr" style="line-height:1.38;"><span style="font-size:11pt;font-weight:400;">The frost came </span><span style="font-size:11pt;font-style:italic;font-weight:400;">early</span><span style="font-size:11pt;font-weight:700;"> that year.</span></p></b>`
    expect(htmlToMarkdown(docs)).toBe('The frost came *early* **that year.**\n')
  })

  it('keeps headings, links, lists, quotes, scene breaks and line breaks', () => {
    const html =
      '<h2>Pear trees</h2><p>Salt <a href="https://example.com/salt">damages</a> roots.<br>Always.</p><ul><li>north rows</li><li>south rows</li></ul><blockquote><p>Do not sell.</p></blockquote><hr><ol><li>first</li></ol>'
    expect(htmlToMarkdown(html)).toBe(
      '## Pear trees\n\nSalt [damages](https://example.com/salt) roots.\\\nAlways.\n\n- north rows\n- south rows\n\n> Do not sell.\n\n* * *\n\n1. first\n',
    )
  })

  it('drops scripts, styles and images, and keeps the text of tables and code', () => {
    const html =
      '<style>p{color:red}</style><p>Salt<img src="https://example.com/x.png" alt="x"><script>alert(1)</script></p><table><tr><td>north</td><td>south</td></tr></table><pre><code>plain words</code></pre>'
    expect(htmlToMarkdown(html)).toBe('Salt\n\nnorth south\n\nplain words\n')
  })

  it('keeps the text of links that are not web, mail or project links', () => {
    expect(htmlToMarkdown('<p><a href="javascript:alert(1)">click</a> and <a href="notes/ideas.md">notes</a></p>')).toBe(
      'click and [notes](notes/ideas.md)\n',
    )
  })

  it('escapes text that would otherwise become markup', () => {
    const markdown = htmlToMarkdown('<p>&lt;script&gt;alert(1)&lt;/script&gt; and *stars* and [brackets]</p>')
    expect(markdown).not.toMatch(/(^|[^\\])<script/)
    expect(markdown).toContain('\\*stars\\*')
  })

  it('gives plain text for text without formatting', () => {
    expect(htmlToMarkdown('<span>Just words.</span>')).toBe('Just words.\n')
  })
})

describe('choosing between the HTML and the plain text on the clipboard', () => {
  it('uses the HTML when it carries formatting', () => {
    expect(pastedMarkdown('<p>The frost came <i>early</i>.</p>', 'The frost came early.')).toBe('The frost came *early*.\n')
  })

  it('uses the plain text when the HTML is only styling, as when copying Markdown from a code editor', () => {
    const vscode =
      '<div style="color:#d4d4d4"><div><span style="color:#569cd6">## Frost</span></div><div><span>Some *stars* here.</span></div></div>'
    expect(pastedMarkdown(vscode, '## Frost\nSome *stars* here.')).toBe('## Frost\nSome *stars* here.')
  })

  it('uses the plain text when there is no HTML', () => {
    expect(pastedMarkdown('', 'First.\n\nSecond.')).toBe('First.\n\nSecond.')
  })
})
