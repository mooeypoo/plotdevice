import { describe, expect, it } from 'vitest'
import { latestReleaseSchema } from './updates'

const latest = {
  format: 1,
  version: '0.4.0',
  date: '2026-11-20',
  notes: 'https://github.com/mooeypoo/plotdevice/releases/tag/v0.4.0',
  download: { en: 'https://mooeypoo.github.io/plotdevice/start/install/', he: 'https://mooeypoo.github.io/plotdevice/he/start/install/' },
}

describe('latest.json', () => {
  it('accepts the file the release workflow writes, and fields added later', () => {
    expect(latestReleaseSchema.safeParse(latest).success).toBe(true)
    expect(latestReleaseSchema.safeParse({ ...latest, message: 'later' }).success).toBe(true)
  })

  it.each([
    ['a format it doesn’t know', { ...latest, format: 2 }],
    ['a version that isn’t x.y.z', { ...latest, version: '0.4.0-beta.1' }],
    ['a link that isn’t https', { ...latest, notes: 'http://example.com/' }],
    ['a script link', { ...latest, download: { en: 'javascript:alert(1)' } }],
    ['no English install page', { ...latest, download: { he: latest.download.he } }],
    ['not an object', '0.4.0'],
  ])('refuses %s', (_name, file) => {
    expect(latestReleaseSchema.safeParse(file).success).toBe(false)
  })
})
