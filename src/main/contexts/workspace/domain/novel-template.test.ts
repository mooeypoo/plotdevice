import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { resolveBookWords } from '../../../book-language/book-words'
import { novelTemplate, type NovelTemplateWords } from './novel-template'

/** The template words the composition root resolves for a language. */
function wordsFor(language: string): NovelTemplateWords {
  const { seeds } = resolveBookWords(language)
  return {
    language,
    statuses: seeds.statuses,
    comments: {
      defaults: seeds['comment-defaults'],
      language: seeds['comment-language'],
      calendar: seeds['comment-calendar'],
      threads: seeds['comment-threads'],
      threadName: seeds['comment-thread-name'],
      fileNames: seeds['comment-file-names'],
      orderPrefix: seeds['comment-order-prefix'],
      folders: seeds['comment-folders'],
      template: seeds['comment-template']
    }
  }
}
const ENGLISH = wordsFor('en')

describe('novelTemplate', () => {
  it('starts and ends the frontmatter block, with LF line endings', () => {
    const text = novelTemplate('The Salt Orchard', ENGLISH)
    expect(text.startsWith('---\n')).toBe(true)
    expect(text.endsWith('\n---\n')).toBe(true)
    expect(text).not.toContain('\r')
  })

  it.each(['The Salt Orchard', 'Ilka: The Return', 'She said "no"', 'בוקר במטע', 'Back\\slash'])(
    'quotes the title %j safely',
    (title) => {
      expect(novelTemplate(title, ENGLISH)).toContain(`title: ${JSON.stringify(title)}\n`)
    }
  )

  it('lines up the comments after values in one column', () => {
    const columns = novelTemplate('The Salt Orchard', ENGLISH)
      .split('\n')
      .filter((line) => /\S\s+# /.test(line))
      .map((line) => line.indexOf('# '))
    expect(new Set(columns)).toEqual(new Set([31]))
  })

  it('writes every settings key', () => {
    const text = novelTemplate('x', ENGLISH)
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

  it('writes the English template as before, plus the language line', () => {
    const before = [
      '---',
      '# Plot Device project. Every key is optional; these are the defaults.',
      'format: 1',
      'title: "The Salt Orchard"',
      'author: ""',
      'calendar: gregorian            # gregorian (dates like 1952-10-03) or day-count (day 14 of the story)',
      'statuses: [idea, outline, draft, revised, final]',
      'threads: []                    # plotlines, for example:',
      '#  - key: main',
      '#    name: Main plot',
      '#    color: "#4f7cac"',
      'settings:',
      '  file_names: ask              # when a title changes, rename its file: ask, always, or never',
      '  order_prefix: false          # true: start new chapter file names with their order number',
      '  folders:                     # where new files go, relative to this folder',
      '    part: manuscript',
      '    chapter: manuscript',
      '    character: characters',
      '    location: locations',
      '    note: notes',
      '    template: templates        # templates for new characters, locations, notes',
      '---',
      ''
    ]
    const after = [...before]
    after.splice(
      5,
      0,
      "language: en                   # the book's language: the words the app writes into it"
    )
    expect(novelTemplate('The Salt Orchard', ENGLISH)).toBe(after.join('\n'))
  })

  it('writes a Hebrew book with Hebrew statuses and comments, and canonical keys and values', () => {
    const text = novelTemplate('בוקר במטע', wordsFor('he'))
    const yaml = text.slice(4, text.lastIndexOf('---'))
    expect(parse(yaml)).toMatchObject({
      language: 'he',
      calendar: 'gregorian',
      statuses: ['רעיון', 'מתווה', 'טיוטה', 'נערך', 'סופי'],
      settings: { file_names: 'ask', order_prefix: false, folders: { chapter: 'manuscript' } }
    })
    expect(text).toContain('# פרויקט של Plot Device.')
  })

  it('quotes statuses YAML would read differently', () => {
    const words = {
      ...ENGLISH,
      statuses: ['idea', 'yes', 'to do: soon', '#tag', 'null', '2nd', 'notes']
    }
    const text = novelTemplate('x', words)
    expect(text).toContain(', notes]')
    const yaml = text.split('\n').find((line) => line.startsWith('statuses'))
    expect(parse(yaml ?? '', { version: '1.1' })).toEqual({
      statuses: ['idea', 'yes', 'to do: soon', '#tag', 'null', '2nd', 'notes']
    })
  })
})
