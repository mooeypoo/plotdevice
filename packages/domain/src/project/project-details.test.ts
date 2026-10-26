import { describe, expect, it } from 'vitest'
import { validateNewProject } from './project-details'

describe('validateNewProject', () => {
  it('accepts a title and a language, trimming the title', () => {
    expect(validateNewProject({ title: '  The Salt Orchard ', language: 'he' })).toEqual({
      ok: true,
      value: { title: 'The Salt Orchard', language: 'he' },
    })
  })

  it('keeps an optional author', () => {
    expect(validateNewProject({ title: 'T', language: 'en-GB', author: 'Ines Varga' })).toEqual({
      ok: true,
      value: { title: 'T', language: 'en-GB', author: 'Ines Varga' },
    })
  })

  it.each([
    [{ title: '', language: 'en' }, ['empty-title']],
    [{ title: 'T', language: 'english' }, ['invalid-language']],
    [{ title: 'a\nb', language: 'en' }, ['multiline-title']],
  ])('rejects %j', (input, problems) => {
    expect(validateNewProject(input)).toEqual({ ok: false, error: problems })
  })
})
