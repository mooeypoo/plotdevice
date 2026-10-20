import { describe, expect, it } from 'vitest'
import { markdownLinkTarget } from './markdown-link'
import type { ProjectPath } from './project-path'

const from = 'manuscript/Part One/The Ferry.md' as ProjectPath

describe('markdownLinkTarget', () => {
  it('resolves a relative, encoded address from the file it is in', () => {
    expect(markdownLinkTarget('[Ilka](../../characters/Ilka%20Szab%C3%B3.md)', from)).toBe(
      'characters/Ilka Szabó.md'
    )
    expect(markdownLinkTarget('[Frost](First%20frost.md#dawn)', from)).toBe(
      'manuscript/Part One/First frost.md'
    )
  })

  it('points nowhere for anything else', () => {
    expect(markdownLinkTarget('[[Ilka Szabó]]', from)).toBeUndefined()
    expect(markdownLinkTarget('[site](https://example.com/a.md)', from)).toBeUndefined()
    expect(markdownLinkTarget('[up](../../../outside.md)', from)).toBeUndefined()
    expect(markdownLinkTarget(42, from)).toBeUndefined()
  })
})
