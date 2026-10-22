import { CompletionContext } from '@codemirror/autocomplete'
import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { linkCompletionSource, linkCompletions, type LinkCompletionTarget } from './link-completion'

const targets: LinkCompletionTarget[] = [
  {
    target: 'Ilka Szabó',
    name: 'Ilka Szabó',
    path: 'characters/Ilka Szabó.md',
    type: 'character',
    aliases: ['Ilk']
  },
  {
    target: 'locations/Marrow',
    name: 'Marrow',
    path: 'locations/Marrow.md',
    type: 'location',
    aliases: []
  }
]

describe('linkCompletions', () => {
  it('offers names with their type, aliases, and path forms for shared names', () => {
    expect(linkCompletions(targets)).toEqual([
      {
        label: 'Ilka Szabó',
        detail: 'character',
        apply: 'Ilka Szabó',
        type: 'character',
        boost: 1
      },
      {
        label: 'Ilk',
        detail: 'Ilka Szabó · character',
        apply: 'Ilka Szabó|Ilk',
        type: 'character'
      },
      {
        label: 'Marrow',
        detail: 'location · locations/Marrow',
        apply: 'locations/Marrow',
        type: 'location',
        boost: 1
      }
    ])
  })

  it('keeps mixed Hebrew and Latin names and technical paths exact', () => {
    const mixed: LinkCompletionTarget = {
      target: 'characters/יעל',
      name: 'יעל / Yael',
      path: 'characters/יעל.md',
      type: 'character',
      aliases: ['Yael']
    }

    expect(linkCompletions([mixed])).toEqual([
      {
        label: 'יעל / Yael',
        detail: 'character · characters/יעל',
        apply: 'characters/יעל',
        type: 'character',
        boost: 1
      },
      {
        label: 'Yael',
        detail: 'יעל / Yael · character',
        apply: 'characters/יעל|Yael',
        type: 'character'
      }
    ])
  })
})

describe('linkCompletionSource', () => {
  const complete = (
    doc: string,
    pos = doc.length
  ): ReturnType<ReturnType<typeof linkCompletionSource>> =>
    linkCompletionSource(() => targets)(
      new CompletionContext(EditorState.create({ doc }), pos, false)
    )

  it('starts after `[[` and closes the link', () => {
    const result = complete('She met [[Il')
    expect(result?.from).toBe(10)
    expect(result?.options[0]?.apply).toBe('Ilka Szabó]]')
  })

  it('doesn’t add `]]` when the link is already closed', () => {
    const result = complete('She met [[Il]] there', 12)
    expect(result?.options[0]?.apply).toBe('Ilka Szabó')
  })

  it('stays quiet outside a link', () => {
    expect(complete('She met Il')).toBeNull()
    expect(complete('Done [[Ilka]] and ')).toBeNull()
  })
})
