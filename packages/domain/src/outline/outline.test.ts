import type { ProjectPath } from '@plotdevice/shared'
import { describe, expect, it } from 'vitest'
import { applyOutlineEdit, outlineFileFor, type Outline, type OutlineItem } from './outline'

const item = (text: string, children: OutlineItem[] = [], options: Partial<OutlineItem> = {}): OutlineItem => ({
  text,
  checked: null,
  children,
  keptAsWritten: [],
  movable: true,
  ...options,
})

const story: Outline = {
  title: 'Main story',
  preamble: [],
  sections: [
    {
      name: 'Beginning',
      intro: [],
      notes: [],
      items: [item('Ilka inherits the orchard', [item('The will names Marrow')]), item('The first frost')],
    },
    { name: 'Ending', intro: [], notes: [], items: [item('The orchard is sold')] },
  ],
}

const names = (outline: Outline) => outline.sections.map((section) => [section.name, section.items.map((i) => i.text)])

function apply(outline: Outline, edit: Parameters<typeof applyOutlineEdit>[1]): Outline {
  const result = applyOutlineEdit(outline, edit)
  if (!result.ok) throw new Error(result.error)
  return result.value
}

describe('editing an outline', () => {
  it('moves a card to another section, with its details', () => {
    const after = apply(story, { kind: 'move-item', from: { section: 0, path: [0] }, to: { section: 1, parentPath: [], index: 1 } })
    expect(names(after)).toEqual([
      ['Beginning', ['The first frost']],
      ['Ending', ['The orchard is sold', 'Ilka inherits the orchard']],
    ])
    expect(after.sections[1]?.items[1]?.children.map((c) => c.text)).toEqual(['The will names Marrow'])
  })

  it('turns a card into a detail of another card, and back', () => {
    const nested = apply(story, { kind: 'move-item', from: { section: 0, path: [1] }, to: { section: 0, parentPath: [0], index: 1 } })
    expect(nested.sections[0]?.items[0]?.children.map((c) => c.text)).toEqual(['The will names Marrow', 'The first frost'])
    const back = apply(nested, { kind: 'move-item', from: { section: 0, path: [0, 1] }, to: { section: 0, parentPath: [], index: 1 } })
    expect(back).toEqual(story)
  })

  it('leaves the original outline unchanged', () => {
    const before = JSON.stringify(story)
    apply(story, { kind: 'delete-item', at: { section: 0, path: [0] } })
    expect(JSON.stringify(story)).toBe(before)
  })

  it('adds, renames and deletes cards, details and sections, in any language', () => {
    let after = apply(story, { kind: 'add-item', to: { section: 1, parentPath: [0], index: 0 }, text: 'לבֵּאה אין מה לומר' })
    after = apply(after, { kind: 'rename-section', section: 1, text: 'סוף' })
    after = apply(after, { kind: 'add-section', index: 1, text: 'Middle 🍐' })
    after = apply(after, { kind: 'delete-item', at: { section: 0, path: [1] } })
    expect(names(after)).toEqual([
      ['Beginning', ['Ilka inherits the orchard']],
      ['Middle 🍐', []],
      ['סוף', ['The orchard is sold']],
    ])
    expect(after.sections[2]?.items[0]?.children.map((c) => c.text)).toEqual(['לבֵּאה אין מה לומר'])
  })

  it('moves and deletes whole sections, and sets the title', () => {
    let after = apply(story, { kind: 'move-section', section: 1, index: 0 })
    expect(names(after).map(([name]) => name)).toEqual(['Ending', 'Beginning'])
    after = apply(after, { kind: 'delete-section', section: 1 })
    expect(names(after)).toEqual([['Ending', ['The orchard is sold']]])
    expect(apply(story, { kind: 'set-title', text: 'מטע המלח' }).title).toBe('מטע המלח')
  })

  it('removes the unnamed section once its last card moves out', () => {
    const loose: Outline = {
      title: null,
      preamble: [],
      sections: [{ name: null, intro: [], notes: [], items: [item('A loose idea')] }, ...story.sections],
    }
    const after = apply(loose, { kind: 'move-item', from: { section: 0, path: [0] }, to: { section: 1, parentPath: [], index: 0 } })
    expect(names(after).map(([name]) => name)).toEqual(['Beginning', 'Ending'])
  })
})

describe('edits the outline refuses', () => {
  const refusal = (outline: Outline, edit: Parameters<typeof applyOutlineEdit>[1]) => {
    const result = applyOutlineEdit(outline, edit)
    return result.ok ? null : result.error
  }

  it('moving a card inside itself', () => {
    expect(refusal(story, { kind: 'move-item', from: { section: 0, path: [0] }, to: { section: 0, parentPath: [0, 0], index: 0 } })).toBe(
      'into-own-subtree',
    )
  })

  it('moving an item that shares its line with other Markdown', () => {
    const locked: Outline = {
      title: null,
      preamble: [],
      sections: [{ name: 'S', intro: [], notes: [], items: [item('stuck', [], { movable: false }), item('free')] }],
    }
    expect(refusal(locked, { kind: 'move-item', from: { section: 0, path: [0] }, to: { section: 0, parentPath: [], index: 1 } })).toBe(
      'unmovable-item',
    )
    expect(refusal(locked, { kind: 'delete-item', at: { section: 0, path: [0] } })).toBe('unmovable-item')
  })

  it('naming, moving or deleting the unnamed section, or putting a section above it', () => {
    const loose: Outline = {
      title: null,
      preamble: [],
      sections: [{ name: null, intro: [], notes: [], items: [item('A loose idea')] }, ...story.sections],
    }
    expect(refusal(loose, { kind: 'rename-section', section: 0, text: 'x' })).toBe('unnamed-section')
    expect(refusal(loose, { kind: 'add-section', index: 0, text: 'x' })).toBe('unnamed-section')
    expect(refusal(loose, { kind: 'move-section', section: 0, index: 1 })).toBe('unnamed-section')
    expect(refusal(loose, { kind: 'move-section', section: 2, index: 0 })).toBe('unnamed-section')
    expect(refusal(loose, { kind: 'delete-section', section: 0 })).toBe('unnamed-section')
  })

  it('empty or multi-line text', () => {
    expect(refusal(story, { kind: 'add-item', to: { section: 0, parentPath: [], index: 0 }, text: '   ' })).toBe('empty-text')
    expect(refusal(story, { kind: 'rename-section', section: 0, text: '' })).toBe('empty-text')
    expect(refusal(story, { kind: 'rename-item', at: { section: 0, path: [0] }, text: 'two\nlines' })).toBe('multiline-text')
  })

  it('missing items and positions', () => {
    expect(refusal(story, { kind: 'rename-item', at: { section: 0, path: [5] }, text: 'x' })).toBe('no-such-item')
    expect(refusal(story, { kind: 'add-item', to: { section: 4, parentPath: [], index: 0 }, text: 'x' })).toBe('no-such-section')
    expect(refusal(story, { kind: 'move-item', from: { section: 0, path: [0] }, to: { section: 1, parentPath: [], index: 3 } })).toBe(
      'index-out-of-range',
    )
  })
})

describe('outline file names', () => {
  const p = (path: string) => path as ProjectPath

  it('come from the title, in the outlines folder, in any language', () => {
    expect(outlineFileFor('Character arcs', [])).toBe('outlines/character-arcs.md')
    expect(outlineFileFor('קשתות דמויות', [])).toBe('outlines/קשתות-דמויות.md')
  })

  it('never take an existing name, whatever its case', () => {
    expect(outlineFileFor('Main story', [p('outlines/Main-Story.md')])).toBe('outlines/main-story-2.md')
  })

  it('fall back to "outline" when the title has no usable characters', () => {
    expect(outlineFileFor('???', [])).toBe('outlines/outline.md')
    expect(outlineFileFor('con', [])).toBe('outlines/con-outline.md')
  })
})
