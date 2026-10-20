import { describe, expect, it } from 'vitest'
import { linesLinkingHere } from './outline-highlight'

describe('linesLinkingHere', () => {
  it('finds the lines that link to the open chapter, either way', () => {
    const outline = [
      '## Part One',
      '- [[The Ferry]]: Ilka arrives.',
      '- [[First frost|the frost]]: debt.',
      '- [the ferry again](manuscript/The%20Ferry.md)',
      '- Ilka finds the ledger.'
    ].join('\n')
    const ferry = (link: Parameters<Parameters<typeof linesLinkingHere>[1]>[0]): boolean =>
      link.kind === 'wiki' ? link.target === 'The Ferry' : link.address.includes('Ferry')
    expect(linesLinkingHere(outline, ferry)).toEqual([2, 4])
  })
})
