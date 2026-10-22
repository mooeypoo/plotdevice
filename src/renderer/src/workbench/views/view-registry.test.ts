// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import en from '../../../../i18n/en.json'
import { VIEW_CATALOG, VIEW_IDS } from '../model/view-catalog'
import { registeredView, VIEW_REGISTRY } from './view-registry'

describe('view registry', () => {
  it('registers only catalogued views, each under its own id', () => {
    for (const [id, descriptor] of Object.entries(VIEW_REGISTRY)) {
      expect(VIEW_IDS).toContain(id)
      expect(descriptor.id).toBe(id)
      expect(VIEW_CATALOG[descriptor.id].regions.length).toBeGreaterThan(0)
    }
  })

  it('registers every view that exists today and none of the planned ones yet', () => {
    expect(Object.keys(VIEW_REGISTRY).sort()).toEqual(
      [
        'binder',
        'codex',
        'document',
        'interactions',
        'outline',
        'overview',
        'properties',
        'reference',
        'timeline',
        'warnings'
      ].sort()
    )
  })

  it('titles every view with an existing message', () => {
    for (const descriptor of Object.values(VIEW_REGISTRY)) {
      expect(Object.keys(en)).toContain(descriptor.title)
    }
  })

  it('treats asking for an unregistered view as a bug', () => {
    expect(() => registeredView('plot-board')).toThrow('View not registered: plot-board')
  })
})
