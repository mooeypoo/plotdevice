import { describe, expect, it } from 'vitest'
import { isUnknownChapterForm, parseChapterForm } from './chapter-form'

describe('a chapter’s form', () => {
  it('is a poem only when the file says so', () => {
    expect(parseChapterForm('poem')).toBe('poem')
    expect(parseChapterForm(' Poem ')).toBe('poem')
    expect(parseChapterForm(undefined)).toBe('prose')
    expect(parseChapterForm('prose')).toBe('prose')
  })

  it('treats a form it doesn’t know as prose, and says so', () => {
    expect(parseChapterForm('screenplay')).toBe('prose')
    expect(isUnknownChapterForm('screenplay')).toBe(true)
    expect(isUnknownChapterForm(3)).toBe(true)
    expect(isUnknownChapterForm('poem')).toBe(false)
    expect(isUnknownChapterForm('prose')).toBe(false)
    expect(isUnknownChapterForm(undefined)).toBe(false)
  })
})
