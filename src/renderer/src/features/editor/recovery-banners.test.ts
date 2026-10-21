// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { createFakePlotDeviceApi } from '../../app/fake-plot-device-api'
import { plotDeviceApi } from '../../app/plot-device-api'
import { useUiLanguageStore } from '../../app/ui-language-store'
import ConflictBanner from './ConflictBanner.vue'
import MissingFileBanner from './MissingFileBanner.vue'

beforeEach(async () => {
  setActivePinia(createPinia())
  const fake = createFakePlotDeviceApi()
  plotDeviceApi.current = () => fake.api
  await useUiLanguageStore().initialize()
})

describe('localized recovery controls', () => {
  it('retains conflict choices, disabled state, path isolation and focus on a live switch', async () => {
    const banner = mount(ConflictBanner, {
      props: {
        busy: false,
        readOnly: false,
        error: null,
        recoveredPath: 'notes/יעל (recovered).md'
      },
      attachTo: document.body
    })
    const buttons = banner.findAll<HTMLButtonElement>('button')
    buttons[1]?.element.focus()
    await useUiLanguageStore().change('he')
    expect(banner.text()).toContain('השמירה האוטומטית מושהית')
    expect(banner.text()).toContain('ללא אישור מפורש')
    expect(banner.get('bdi').text()).toBe('notes/יעל (recovered).md')
    expect(banner.findAll('button')[1]?.element).toBe(buttons[1]?.element)
    expect(document.activeElement).toBe(buttons[1]?.element)
    await buttons[0]?.trigger('click')
    await buttons[1]?.trigger('click')
    await buttons[2]?.trigger('click')
    expect(banner.emitted('loadTheirs')).toEqual([[]])
    expect(banner.emitted('recoverCopy')).toEqual([[]])
    expect(banner.emitted('keepMine')).toEqual([[]])
    await banner.setProps({ readOnly: true })
    expect(buttons.map((button) => button.element.disabled)).toEqual([false, true, true])
    await banner.setProps({ busy: true })
    expect(buttons.every((button) => button.element.disabled)).toBe(true)
    banner.unmount()
  })

  it('localizes a missing chapter and its reappearance without changing action semantics', async () => {
    const banner = mount(MissingFileBanner, {
      props: {
        kind: 'chapter',
        busy: false,
        readOnly: false,
        reappeared: false,
        error: null,
        recoveredPath: null
      }
    })
    expect(banner.text()).toContain('deleted this chapter')
    await useUiLanguageStore().change('he')
    expect(banner.text()).toContain('קובץ מסוג פרק')
    expect(banner.text()).toContain('אינה יוצרת מחדש')
    await banner.findAll('button')[0]?.trigger('click')
    expect(banner.emitted('discard')).toEqual([[]])
    await banner.setProps({ reappeared: true })
    expect(banner.text()).toContain('לא תדרוס אותה באופן אוטומטי')
    expect(banner.findAll('button')).toHaveLength(3)
    await banner.findAll('button')[1]?.trigger('click')
    expect(banner.emitted('loadTheirs')).toEqual([[]])
    await banner.findAll('button')[2]?.trigger('click')
    expect(banner.emitted('saveAsNew')).toEqual([[]])
    await banner.setProps({ busy: true })
    expect(
      banner.findAll<HTMLButtonElement>('button').every((button) => button.element.disabled)
    ).toBe(true)
    banner.unmount()
  })
})
