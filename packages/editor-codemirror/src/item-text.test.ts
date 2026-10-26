import { describe, expect, it } from 'vitest'
import { linkQueryAt, linkRanges } from './item-text'

describe('links in a card’s text', () => {
  it('are found with the name to show, whatever their form', () => {
    const text =
      'Must meet [Bea Halmi](../characters/bea.md) at [the gate](<../manuscript/the gate.md> "first") and [[noel|Noël]], not `[x](y)`'
    expect(linkRanges(text).map((link) => [text.slice(link.from, link.to), link.label])).toEqual([
      ['[Bea Halmi](../characters/bea.md)', 'Bea Halmi'],
      ['[the gate](<../manuscript/the gate.md> "first")', 'the gate'],
      ['[[noel|Noël]]', 'Noël'],
    ])
  })

  it('show escaped brackets as the brackets themselves', () => {
    expect(linkRanges('[Bea \\[the elder\\]](bea.md)')).toEqual([{ from: 0, to: 27, label: 'Bea [the elder]' }])
  })
})

describe('typing a link name', () => {
  const at = (text: string) => linkQueryAt(text, text.length)

  it('starts after @ or [[, and may have spaces', () => {
    expect(at('Must meet @')).toEqual({ from: 10, text: '' })
    expect(at('Must meet @bea ha')).toEqual({ from: 10, text: 'bea ha' })
    expect(at('Must meet [[בּי')).toEqual({ from: 10, text: 'בּי' })
    expect(at('@Ilka')).toEqual({ from: 0, text: 'Ilka' })
  })

  it('is not an email address, a finished link, or a long sentence', () => {
    expect(at('write to ilka@marrow')).toBeNull()
    expect(at('Must meet [[bea]] now')).toBeNull()
    expect(at('Meet [Bea](bea.md) @')).toEqual({ from: 19, text: '' })
    expect(at(`@${'x'.repeat(41)}`)).toBeNull()
    expect(at('Must meet @bea, then')).toBeNull()
  })

  it('looks only before the cursor', () => {
    expect(linkQueryAt('Must meet @bea today', 14)).toEqual({ from: 10, text: 'bea' })
    expect(linkQueryAt('Must meet @bea today', 5)).toBeNull()
  })
})
