// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'
import { createFakePlotDeviceApi, sampleManuscript } from '../../app/fake-plot-device-api'
import { plotDeviceApi } from '../../app/plot-device-api'
import { useWorkspaceStore } from '../../app/workspace-store'
import { useManuscriptStore } from '../../app/manuscript-store'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useWarnings } from '../../app/use-warnings'
import type { WarningGroup } from './warning-groups'
import WarningsPanel from './WarningsPanel.vue'

const groups: WarningGroup[] = [
  {
    id: 'links',
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
    id: 'values',
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

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('WarningsPanel', () => {
  it('retranslates cached diagnostics while retaining DOM identity, focus and exact fixes', async () => {
    const fake = createFakePlotDeviceApi()
    plotDeviceApi.current = () => fake.api
    fake.summary.current = {
      ...fake.summary.current,
      warnings: [{ code: 'format-newer', version: 99 }],
      readOnly: false,
      problems: [{ path: 'notes/מקור.md', problem: 'unknown-type', detail: '<img src=x>' }]
    }
    const getManuscript = vi.spyOn(fake.api.manuscript, 'getManuscript').mockResolvedValue({
      ok: true,
      value: {
        ...sampleManuscript,
        warnings: [
          {
            code: 'ambiguous-link',
            title: 'יעל (Draft)',
            link: '[[Marrow]]',
            location: { kind: 'body' },
            choices: ['characters/Marrow.md', 'locations/Marrow.md'],
            paths: ['The Ferry.md'],
            fix: {
              kind: 'path-form',
              name: 'Marrow',
              choices: ['characters/Marrow.md', 'locations/Marrow.md']
            }
          },
          {
            code: 'unusable-value',
            title: 'Shapes',
            reason: 'unquoted-link',
            key: 'pov',
            value: '[[Ilka]]',
            paths: ['Shapes.md'],
            fix: { kind: 'quote', key: 'pov' }
          }
        ]
      }
    })
    const getProject = vi.spyOn(fake.api.workspace, 'refreshProject')
    vi.spyOn(fake.api.workspace, 'openProject').mockResolvedValue({
      ok: true,
      value: fake.summary.current
    })
    const fix = vi.spyOn(fake.api.manuscript, 'fixWarning')
    const language = useUiLanguageStore()
    await language.initialize()
    await useWorkspaceStore().openProject('/book')
    await useManuscriptStore().load()
    const chosen = vi.fn()
    const Host = defineComponent({
      setup() {
        const warnings = useWarnings()
        return () =>
          h(WarningsPanel, {
            groups: warnings.groups.value,
            canOpen: () => true,
            readOnly: false,
            onFix: chosen
          })
      }
    })
    const panel = mount(Host, { attachTo: document.body })
    const buttons = panel.findAll<HTMLButtonElement>('button.fix')
    const target = buttons[1]
    if (target === undefined) throw new Error('Expected target fix')
    const row = target.element.closest('li')
    const group = target.element.closest('section')
    target.element.focus()
    const reads = getManuscript.mock.calls.length
    const files = [...fake.files]
    expect(panel.text()).toContain('could mean')
    expect(panel.text()).toContain('read-only')
    await language.change('he')
    await flushPromises()
    expect(panel.text()).toContain('יכול להתייחס')
    expect(panel.text()).toContain('לקריאה בלבד')
    expect(panel.text()).toContain('\u2068יעל (Draft)\u2069')
    expect(panel.text()).toContain('<img src=x>')
    expect(panel.find('img').exists()).toBe(false)
    expect(panel.findAll('button.fix')[1]?.element).toBe(target.element)
    expect(target.element.closest('li')).toBe(row)
    expect(target.element.closest('section')).toBe(group)
    expect(document.activeElement).toBe(target.element)
    expect(getManuscript).toHaveBeenCalledTimes(reads)
    expect(getProject).not.toHaveBeenCalled()
    expect(fix).not.toHaveBeenCalled()
    expect([...fake.files]).toEqual(files)
    expect(fake.saves).toEqual([])
    await target.trigger('click')
    expect(chosen).toHaveBeenCalledWith('The Ferry.md', {
      kind: 'path-form',
      name: 'Marrow',
      choice: 'locations/Marrow.md'
    })
    await panel.findAll('button.fix')[2]?.trigger('click')
    expect(chosen).toHaveBeenCalledWith('Shapes.md', { kind: 'quote', key: 'pov' })
    await language.change('en')
    await flushPromises()
    expect(panel.text()).toContain('could mean')
    expect(panel.findAll('button.fix')[1]?.element).toBe(target.element)
    panel.unmount()
  })

  it('offers one button per file an ambiguous link could mean', async () => {
    const panel = mountPanel()
    const buttons = panel.findAll('button.fix')
    expect(buttons.map((button) => button.text().replace(/[\u2068\u2069]/gu, ''))).toEqual([
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
