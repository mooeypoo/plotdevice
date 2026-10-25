import { describe, expect, it } from 'vitest'
import { addBeat } from './add-beat'
import { addColumn } from './add-column'
import { captureBeat } from './capture-beat'
import { editNotes } from './edit-notes'
import { moveBeat } from './move-beat'
import { moveColumn } from './move-column'
import { retitleBeat } from './retitle-beat'

const body = (...lines: string[]): string => lines.join('\n') + '\n'
const ref = (line: number, title: string): { line: number; title: string } => ({ line, title })

const plan = body(
  'Premise.',
  '',
  '## One', // 2
  '- Ferry #main', // 3
  '  - open on the water', // 4
  '- Ledger', // 5
  '',
  '## Two', // 7
  '- Cannery', // 8
  '- Foreman' // 9
)

describe('moveBeat', () => {
  it('moves a beat with its notes before another beat, changing no other line', () => {
    expect(
      moveBeat(plan, ref(3, 'Ferry #main'), ref(7, 'Two'), { before: ref(9, 'Foreman') })
    ).toEqual({
      ok: true,
      value: body(
        'Premise.',
        '',
        '## One',
        '- Ledger',
        '',
        '## Two',
        '- Cannery',
        '- Ferry #main',
        '  - open on the water',
        '- Foreman'
      )
    })
  })

  it('moves a beat to the end of a column, after its last line', () => {
    expect(moveBeat(plan, ref(8, 'Cannery'), ref(2, 'One'), 'end')).toMatchObject({
      value: body(
        'Premise.',
        '',
        '## One',
        '- Ferry #main',
        '  - open on the water',
        '- Ledger',
        '- Cannery',
        '',
        '## Two',
        '- Foreman'
      )
    })
  })

  it('carries the blank line of a loose list, and leaves the text alone for a move in place', () => {
    const loose = body('## One', '- A', '', '- B', '', '- C')
    expect(moveBeat(loose, ref(3, 'B'), ref(0, 'One'), 'end')).toMatchObject({
      value: body('## One', '- A', '', '- C', '', '- B')
    })
    expect(moveBeat(loose, ref(3, 'B'), ref(0, 'One'), { before: ref(5, 'C') })).toEqual({
      ok: true,
      value: loose
    })
  })

  it('keeps CRLF, and gives a moved last line without a line break the file’s own', () => {
    const crlf = '## One\r\n- A\r\n## Two\r\n- B'
    expect(moveBeat(crlf, ref(3, 'B'), ref(0, 'One'), { before: ref(1, 'A') })).toEqual({
      ok: true,
      value: '## One\r\n- B\r\n- A\r\n## Two\r\n'
    })
  })

  it('refuses when the outline no longer has that beat or column', () => {
    expect(moveBeat(plan, ref(3, 'Ferry'), ref(7, 'Two'), 'end')).toMatchObject({
      ok: false,
      error: { code: 'outline-shape-changed' }
    })
    expect(moveBeat(plan, ref(3, 'Ferry #main'), ref(7, 'Three'), 'end')).toMatchObject({
      ok: false,
      error: { code: 'outline-shape-changed' }
    })
  })
})

describe('moveColumn', () => {
  it('moves a column with its separating blank lines, and back again byte for byte', () => {
    const moved = moveColumn(plan, ref(7, 'Two'), { before: ref(2, 'One') })
    expect(moved).toMatchObject({
      value: body(
        'Premise.',
        '',
        '## Two',
        '- Cannery',
        '- Foreman',
        '',
        '## One',
        '- Ferry #main',
        '  - open on the water',
        '- Ledger'
      )
    })
    if (!moved.ok) return
    expect(moveColumn(moved.value, ref(2, 'Two'), 'end')).toEqual({ ok: true, value: plan })
  })
})

describe('addBeat and retitleBeat', () => {
  it('adds a beat in the column’s own marker, and refuses a title that isn’t a beat', () => {
    const starred = body('## One', '* A', '* B')
    expect(addBeat(starred, ref(0, 'One'), ' New ', { before: ref(2, 'B') })).toMatchObject({
      value: body('## One', '* A', '* New', '* B')
    })
    // `- ---` is a horizontal rule in Markdown, not a list item.
    expect(addBeat(plan, ref(2, 'One'), '---', 'end')).toMatchObject({
      error: { code: 'invalid-title' }
    })
    expect(addBeat(starred, ref(0, 'One'), 'two\nlines', 'end')).toMatchObject({
      error: { code: 'invalid-title' }
    })
  })

  it('retitles only the title, keeping the marker’s spacing and the line break', () => {
    expect(retitleBeat('## One\r\n+   Old\r\n', ref(1, 'Old'), 'החדש #main')).toEqual({
      ok: true,
      value: '## One\r\n+   החדש #main\r\n'
    })
  })
})

describe('editNotes', () => {
  it('replaces the notes at their indent, or lines new notes up under the title', () => {
    expect(editNotes(plan, ref(3, 'Ferry #main'), 'first\n\n  nested')).toMatchObject({
      value: plan.replace('  - open on the water\n', '  first\n\n    nested\n')
    })
    expect(editNotes(plan, ref(5, 'Ledger'), 'Bea lies.')).toMatchObject({
      value: plan.replace('- Ledger\n', '- Ledger\n  Bea lies.\n')
    })
    expect(editNotes(plan, ref(3, 'Ferry #main'), '')).toMatchObject({
      value: plan.replace('  - open on the water\n', '')
    })
  })
})

describe('captureBeat', () => {
  const inbox = { write: 'רעיונות', recognize: ['רעיונות', 'Inbox'] }

  it('adds to the end of an inbox in any accepted spelling, touching nothing else', () => {
    const withInbox = body('## One', '- A', '', '## inbox', '- Old idea', '', 'Plain.')
    expect(captureBeat(withInbox, inbox, 'New idea')).toMatchObject({
      value: body('## One', '- A', '', '## inbox', '- Old idea', '', 'Plain.', '- New idea')
    })
  })

  it('adds the heading in the book’s spelling when there is no inbox', () => {
    expect(captureBeat('## One\n- A', inbox, 'רעיון')).toEqual({
      ok: true,
      value: '## One\n- A\n\n## רעיונות\n- רעיון\n'
    })
    expect(captureBeat('', inbox, 'First')).toEqual({ ok: true, value: '## רעיונות\n- First\n' })
  })
})

describe('addColumn', () => {
  it('adds a heading before another column, with a blank line after it, changing no other line', () => {
    expect(addColumn(plan, 'Interlude', { before: ref(7, 'Two') })).toEqual({
      ok: true,
      value: body(
        'Premise.',
        '',
        '## One',
        '- Ferry #main',
        '  - open on the water',
        '- Ledger',
        '',
        '## Interlude',
        '',
        '## Two',
        '- Cannery',
        '- Foreman'
      )
    })
  })

  it('adds a heading after the last line, separated by a blank line', () => {
    expect(addColumn(plan, 'Part Three', 'end')).toEqual({
      ok: true,
      value: body(
        'Premise.',
        '',
        '## One',
        '- Ferry #main',
        '  - open on the water',
        '- Ledger',
        '',
        '## Two',
        '- Cannery',
        '- Foreman',
        '',
        '## Part Three'
      )
    })
  })

  it('keeps Windows line endings and a file without a final line break', () => {
    expect(addColumn('## One\r\n- Ferry', 'Two', 'end')).toEqual({
      ok: true,
      value: '## One\r\n- Ferry\r\n\r\n## Two'
    })
    expect(addColumn('', 'First', 'end')).toEqual({ ok: true, value: '## First\n' })
  })

  it('refuses a name another column has, in any case', () => {
    expect(addColumn(plan, 'two', 'end')).toMatchObject({
      ok: false,
      error: { code: 'invalid-column', diagnostic: { reason: 'outline-column-exists' } }
    })
  })

  it('refuses an empty name, several lines, or one that reads back as something else', () => {
    for (const title of ['  ', 'a\nb', '#']) {
      expect(addColumn(plan, title, 'end')).toMatchObject({
        ok: false,
        error: { diagnostic: { reason: 'outline-invalid-column' } }
      })
    }
  })

  it('refuses when the column it goes before is no longer there', () => {
    expect(addColumn(plan, 'Interlude', { before: ref(8, 'Two') })).toMatchObject({
      ok: false,
      error: { code: 'outline-shape-changed' }
    })
  })
})
