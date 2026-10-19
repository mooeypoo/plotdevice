import { describe, expect, it } from 'vitest'
import { createGetInspectorVocabulary } from './get-inspector-vocabulary'

describe('GetInspectorVocabulary', () => {
  it('combines the manuscript’s statuses with chronology’s threads and calendar', async () => {
    const get = createGetInspectorVocabulary({
      listStatuses: () => Promise.resolve(['idea', 'draft']),
      getChronologySettings: () =>
        Promise.resolve({ calendar: 'day-count', threads: [{ key: 'main', name: 'Main plot' }] })
    })
    expect(await get()).toEqual({
      statuses: ['idea', 'draft'],
      threads: [{ key: 'main', name: 'Main plot' }],
      calendar: 'day-count'
    })
  })
})
