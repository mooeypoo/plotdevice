import { describe, expect, it } from 'vitest'
import { checkDeploymentFreshness } from './release-data'
import { installerNames } from '../release/draft'
import type { ReleaseState } from '../release/published-release'

const built: ReleaseState = {
  schemaVersion: 1,
  source: 'github',
  generatedAt: '2026-10-20T12:00:00.000Z',
  stable: null
}
const current = { ...built, generatedAt: '2026-10-20T12:01:00.000Z' }

describe('queued Pages deployment freshness', () => {
  it('allows a newer discovery timestamp when release state and main are unchanged', () => {
    expect(() => {
      checkDeploymentFreshness(built, current, 'same', 'same', 'same')
    }).not.toThrow()
  })

  it.each([
    ['built', 'new', 'new'],
    ['built', 'built', 'new'],
    ['built', 'different', 'built']
  ])('rejects obsolete build or changed checkout/main (%s, %s, %s)', (artifact, checkout, main) => {
    expect(() => {
      checkDeploymentFreshness(built, current, artifact, checkout, main)
    }).toThrow('differs')
  })

  it('rejects preview and an obsolete null snapshot when a stable release appears', () => {
    expect(() => {
      checkDeploymentFreshness({ ...built, source: 'preview' }, current, 'same', 'same', 'same')
    }).toThrow('preview')
    const version = '0.1.0'
    const tag = `v${version}`
    expect(() => {
      checkDeploymentFreshness(
        built,
        {
          ...current,
          stable: {
            version,
            tag,
            publishedAt: current.generatedAt,
            releaseUrl: `https://github.com/mooeypoo/plotdevice/releases/tag/${tag}`,
            downloads: [...installerNames(version), 'release-metadata.json', 'SHA256SUMS'].map(
              (name) => ({
                name,
                url: `https://github.com/mooeypoo/plotdevice/releases/download/${tag}/${name}`,
                size: 100,
                sha256: 'a'.repeat(64)
              })
            )
          }
        },
        'same',
        'same',
        'same'
      )
    }).toThrow('state changed')
  })
})
