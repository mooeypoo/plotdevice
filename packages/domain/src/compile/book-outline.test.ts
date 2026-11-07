import type { ProjectPath } from '@plotdevice/shared'
import { describe, expect, it } from 'vitest'
import type { Contents } from '../manuscript/index'
import { bookOutline } from './book-outline'

const p = (path: string) => path as ProjectPath

const contents: Contents = {
  entries: [
    { kind: 'chapter', file: p('manuscript/prologue.md'), linkText: 'Prologue' },
    {
      kind: 'part',
      name: 'Part One: Arrival',
      chapters: [
        { kind: 'chapter', file: p('manuscript/crossing.md'), linkText: 'The Crossing' },
        { kind: 'chapter', file: p('manuscript/salt-wind.md'), linkText: 'Salt Wind' },
      ],
    },
    { kind: 'part', name: 'חלק שני', chapters: [{ kind: 'chapter', file: p('manuscript/frost.md'), linkText: 'כפור' }] },
  ],
}
const titles = new Map([[p('manuscript/salt-wind.md'), 'Salt Wind, Again']])

describe('the book as export lays it out', () => {
  it('gives parts and chapters in reading order, each chapter with its number and its title', () => {
    expect(bookOutline(contents, 'continuous', titles)).toEqual([
      { kind: 'chapter', file: 'manuscript/prologue.md', number: 1, name: 'Prologue' },
      { kind: 'part', name: 'Part One: Arrival' },
      { kind: 'chapter', file: 'manuscript/crossing.md', number: 2, name: 'The Crossing' },
      { kind: 'chapter', file: 'manuscript/salt-wind.md', number: 3, name: 'Salt Wind, Again' },
      { kind: 'part', name: 'חלק שני' },
      { kind: 'chapter', file: 'manuscript/frost.md', number: 4, name: 'כפור' },
    ])
  })

  it('numbers as the book says, including no numbers at all', () => {
    const numbers = (numbering: 'per-part' | 'none') =>
      bookOutline(contents, numbering, titles).flatMap((entry) => (entry.kind === 'chapter' ? [entry.number] : []))
    expect(numbers('per-part')).toEqual([null, 1, 2, 1])
    expect(numbers('none')).toEqual([null, null, null, null])
  })

  it('keeps only the chosen chapters, in the book’s order, with the numbers they have in the whole book', () => {
    const chosen = new Set([p('manuscript/frost.md'), p('manuscript/salt-wind.md')])
    expect(bookOutline(contents, 'continuous', titles, chosen)).toEqual([
      { kind: 'part', name: 'Part One: Arrival' },
      { kind: 'chapter', file: 'manuscript/salt-wind.md', number: 3, name: 'Salt Wind, Again' },
      { kind: 'part', name: 'חלק שני' },
      { kind: 'chapter', file: 'manuscript/frost.md', number: 4, name: 'כפור' },
    ])
  })

  it('leaves out a part when none of its chapters is chosen', () => {
    expect(bookOutline(contents, 'continuous', titles, new Set([p('manuscript/prologue.md')]))).toEqual([
      { kind: 'chapter', file: 'manuscript/prologue.md', number: 1, name: 'Prologue' },
    ])
  })

  it('trims names, and keeps an empty part', () => {
    const odd: Contents = { entries: [{ kind: 'part', name: '  Interlude  ', chapters: [] }] }
    expect(bookOutline(odd, 'continuous', new Map())).toEqual([{ kind: 'part', name: 'Interlude' }])
  })
})
