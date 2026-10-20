// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { WarningGroup } from './warning-groups'
import WarningsPanel from './WarningsPanel.vue'

const groups: WarningGroup[] = [
  {
    heading: 'Links that could mean two files',
    items: [
      {
        key: 'a',
        message: 'The Ferry: [[Marrow]] in the text could mean…',
        path: 'The Ferry.md',
        fix: {
          kind: 'path-form',
          name: 'Marrow',
          choices: ['characters/Marrow.md', 'locations/Marrow.md']
        }
      }
    ]
  },
  {
    heading: 'Values the app can’t use',
    items: [
      {
        key: 'b',
        message: 'Shapes: pov isn’t in quotes',
        path: 'Shapes.md',
        fix: { kind: 'quote', key: 'pov' }
      }
    ]
  }
]

const mountPanel = (readOnly = false): ReturnType<typeof mount> =>
  mount(WarningsPanel, { props: { groups, canOpen: () => true, readOnly } })

describe('WarningsPanel', () => {
  it('offers one button per file an ambiguous link could mean', async () => {
    const panel = mountPanel()
    const buttons = panel.findAll('button.fix')
    expect(buttons.map((button) => button.text())).toEqual([
      'Means characters/Marrow',
      'Means locations/Marrow',
      'Add quotes'
    ])
    await buttons[1]?.trigger('click')
    await buttons[2]?.trigger('click')
    expect(panel.emitted('fix')).toEqual([
      ['The Ferry.md', { kind: 'path-form', name: 'Marrow', choice: 'locations/Marrow.md' }],
      ['Shapes.md', { kind: 'quote', key: 'pov' }]
    ])
  })

  it('offers no fixes in a read-only project', () => {
    expect(mountPanel(true).findAll('button.fix')).toHaveLength(0)
  })
})
