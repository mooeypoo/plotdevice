import { describe, expect, it } from 'vitest'
import { isInFolder } from './is-in-folder'
import type { ProjectPath } from './project-path'

const p = (value: string): ProjectPath => value as ProjectPath

describe('isInFolder', () => {
  it('matches files at any depth, ignoring case, and nothing outside', () => {
    expect(isInFolder(p('templates/character.md'), p('templates'))).toBe(true)
    expect(isInFolder(p('Templates/old/note.md'), p('templates'))).toBe(true)
    expect(isInFolder(p('templates.md'), p('templates'))).toBe(false)
    expect(isInFolder(p('templates-old/a.md'), p('templates'))).toBe(false)
    expect(isInFolder(p('a.md'), undefined)).toBe(false)
  })
})
