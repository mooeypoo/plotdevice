import { describe, expect, it } from 'vitest'
import { DEFAULT_PROJECT_SETTINGS } from './project-settings'
import { readProject, readUnreadableProject } from './project'
import type { ProjectRoot } from './project-root'

const root = '/home/writer/my-novel' as ProjectRoot

describe('readProject', () => {
  it('reads the keys workspace owns', () => {
    const project = readProject(root, 'my-novel', {
      format: 1,
      title: 'The Preservers',
      author: 'Moriel',
      calendar: 'gregorian',
      settings: { file_names: 'never' }
    })
    expect(project).toEqual({
      root,
      title: 'The Preservers',
      author: 'Moriel',
      formatVersion: 1,
      readOnly: false,
      settings: { ...DEFAULT_PROJECT_SETTINGS, fileNames: 'never' },
      warnings: []
    })
  })

  it('falls back to the folder name for a missing or empty title', () => {
    expect(readProject(root, 'my-novel', { format: 1 }).title).toBe('my-novel')
    expect(readProject(root, 'my-novel', { format: 1, title: '   ' }).title).toBe('my-novel')
  })

  it('warns about a title or author that is not text', () => {
    const project = readProject(root, 'my-novel', { format: 1, title: 42, author: ['A', 'B'] })
    expect(project.title).toBe('my-novel')
    expect(project.author).toBeUndefined()
    expect(project.warnings.map((warning) => warning.code)).toEqual([
      'title-invalid',
      'author-invalid'
    ])
  })

  it('treats an empty author as no author', () => {
    expect(readProject(root, 'my-novel', { format: 1, author: '' }).author).toBeUndefined()
  })

  it('handles a novel.md with no frontmatter keys at all', () => {
    const project = readProject(root, 'my-novel', undefined)
    expect(project.title).toBe('my-novel')
    expect(project.warnings.map((warning) => warning.code)).toEqual(['format-missing'])
  })

  it('collects warnings from format and settings', () => {
    const project = readProject(root, 'my-novel', { format: 2, settings: { order_prefix: 'no' } })
    expect(project.readOnly).toBe(true)
    expect(project.warnings.map((warning) => warning.code)).toEqual([
      'format-newer',
      'setting-invalid'
    ])
  })
})

describe('readUnreadableProject', () => {
  it('opens read-only with defaults and says why', () => {
    const project = readUnreadableProject(root, 'my-novel', 'unparseable-frontmatter')
    expect(project).toMatchObject({
      title: 'my-novel',
      readOnly: true,
      settings: DEFAULT_PROJECT_SETTINGS,
      warnings: [{ code: 'novel-file-unreadable' }]
    })
  })
})
