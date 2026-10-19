import { describe, expect, it } from 'vitest'
import { novelTemplate } from './novel-template'

describe('novelTemplate', () => {
  it('starts and ends the frontmatter block, with LF line endings', () => {
    const text = novelTemplate('The Preservers')
    expect(text.startsWith('---\n')).toBe(true)
    expect(text.endsWith('\n---\n')).toBe(true)
    expect(text).not.toContain('\r')
  })

  it.each(['The Preservers', 'Mira: The Return', 'She said "no"', 'הגעה לנמל', 'Back\\slash'])(
    'quotes the title %j safely',
    (title) => {
      expect(novelTemplate(title)).toContain(`title: ${JSON.stringify(title)}\n`)
    }
  )

  it('lines up the comments after values in one column', () => {
    const columns = novelTemplate('The Preservers')
      .split('\n')
      .filter((line) => /\S\s+# /.test(line))
      .map((line) => line.indexOf('# '))
    expect(new Set(columns)).toEqual(new Set([31]))
  })

  it('writes every settings key', () => {
    const text = novelTemplate('x')
    for (const key of [
      'file_names:',
      'order_prefix:',
      'part:',
      'chapter:',
      'character:',
      'location:',
      'note:'
    ]) {
      expect(text).toContain(key)
    }
  })
})
