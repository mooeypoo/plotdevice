import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { installerNames } from './draft'
import {
  discoverPublishedRelease,
  repository,
  versionFeed,
  type PublishedReleaseRemote
} from './published-release'

const now = '2026-10-20T12:00:00.000Z'
const hash = (text: string) => createHash('sha256').update(text).digest('hex')

function fixture(version = '0.1.0') {
  const tag = `v${version}`
  const commit = 'a'.repeat(40)
  const installers = installerNames(version).map((name, index) => ({
    id: index + 1,
    name,
    size: 100 + index,
    state: 'uploaded',
    digest: `sha256:${hash(name)}`,
    browser_download_url: `https://github.com/${repository}/releases/download/${tag}/${name}`
  }))
  const metadata = {
    schemaVersion: 1,
    version,
    tag,
    commit,
    repository,
    runId: '123',
    architecture: 'x64',
    fileFormat: 1,
    buildUrl: `https://github.com/${repository}/actions/runs/123`,
    assets: installers.map((asset) => ({
      name: asset.name,
      size: asset.size,
      sha256: asset.digest.slice(7)
    }))
  }
  const metadataText = `${JSON.stringify(metadata)}\n`
  const sums = [...metadata.assets, { name: 'release-metadata.json', sha256: hash(metadataText) }]
    .map((asset) => `${asset.sha256}  ${asset.name}\n`)
    .join('')
  const texts = new Map([
    [4, metadataText],
    [5, sums]
  ])
  const release = {
    id: 10,
    tag_name: tag,
    draft: false,
    prerelease: false,
    published_at: now,
    html_url: `https://github.com/${repository}/releases/tag/${tag}`,
    target_commitish: commit,
    assets: [
      ...installers,
      ...[...texts].map(([id, text]) => {
        const name = id === 4 ? 'release-metadata.json' : 'SHA256SUMS'
        return {
          id,
          name,
          size: Buffer.byteLength(text),
          state: 'uploaded',
          digest: `sha256:${hash(text)}`,
          browser_download_url: `https://github.com/${repository}/releases/download/${tag}/${name}`
        }
      })
    ]
  }
  const remote: PublishedReleaseRemote = {
    list: () => Promise.resolve([release]),
    latest: () => Promise.resolve(release),
    asset(id) {
      const text = texts.get(id)
      if (text === undefined) throw new Error('Unexpected metadata asset.')
      return Promise.resolve(text)
    }
  }
  function setText(id: number, text: string): void {
    texts.set(id, text)
    const asset = release.assets.find((entry) => entry.id === id)
    if (asset === undefined) throw new Error('Missing test asset.')
    asset.size = Buffer.byteLength(text)
    asset.digest = `sha256:${hash(text)}`
  }
  return { release, remote, metadata, texts, setText }
}

describe('published release discovery', () => {
  it('verifies exact assets, metadata and checksums and emits a minimal installed-client feed', async () => {
    const test = fixture()
    const state = await discoverPublishedRelease(test.remote, now)
    expect(state.stable?.downloads).toHaveLength(5)
    expect(versionFeed(state)).toEqual({
      schemaVersion: 1,
      generatedAt: now,
      stable: {
        version: '0.1.0',
        tag: 'v0.1.0',
        publishedAt: now,
        releaseUrl: `https://github.com/${repository}/releases/tag/v0.1.0`
      }
    })
  })

  it.each(['none', 'drafts', 'betas'])(
    'returns explicit null for %s without calling latest or downloading assets',
    async (kind) => {
      const test = fixture()
      test.remote.list = () =>
        Promise.resolve(
          kind === 'none'
            ? []
            : [
                {
                  ...test.release,
                  draft: kind === 'drafts',
                  prerelease: kind === 'betas',
                  tag_name: 'v0.2.0-beta.1'
                }
              ]
        )
      test.remote.latest = () => {
        throw new Error('Must not request latest.')
      }
      test.remote.asset = () => {
        throw new Error('Must not download.')
      }
      const state = await discoverPublishedRelease(test.remote, now)
      expect(versionFeed(state).stable).toBeNull()
      expect(state.source).toBe('github')
    }
  )

  it('honors GitHub designation instead of picking newest date or highest version', async () => {
    const test = fixture()
    test.remote.list = () =>
      Promise.resolve([
        { ...test.release, id: 11, tag_name: 'v9.0.0' },
        { ...test.release, id: 12, tag_name: 'v10.0.0-beta.1', prerelease: true },
        test.release
      ])
    expect((await discoverPublishedRelease(test.remote, now)).stable?.version).toBe('0.1.0')
  })

  it.each(['list', 'latest', 'asset'])(
    'propagates %s failures rather than claiming no release',
    async (kind) => {
      const test = fixture()
      const fail = () => Promise.reject(new Error('Authentication/rate-limit/network failure'))
      if (kind === 'list') test.remote.list = fail
      if (kind === 'latest') test.remote.latest = fail
      if (kind === 'asset') test.remote.asset = fail
      await expect(discoverPublishedRelease(test.remote, now)).rejects.toThrow('failure')
    }
  )

  it.each([
    'missing-asset',
    'extra-asset',
    'duplicate',
    'pending',
    'no-digest',
    'unsafe-url',
    'wrong-release-url',
    'prerelease',
    'bad-version',
    'commit',
    'metadata-bytes',
    'checksum-bytes',
    'oversize',
    'stale-list'
  ])('rejects %s mismatch', async (kind) => {
    const test = fixture()
    const first = test.release.assets[0]
    if (first === undefined) throw new Error('Missing test installer.')
    if (kind === 'missing-asset') test.release.assets.pop()
    if (kind === 'extra-asset')
      test.release.assets.push({ ...first, id: 99, name: 'unexpected.exe' })
    if (kind === 'duplicate') test.release.assets[1] = { ...first }
    if (kind === 'pending') first.state = 'open'
    if (kind === 'no-digest') first.digest = ''
    if (kind === 'unsafe-url') first.browser_download_url = 'https://example.invalid/malware.exe'
    if (kind === 'wrong-release-url') test.release.html_url = 'https://example.invalid/release'
    if (kind === 'prerelease') test.release.tag_name = 'v0.2.0-beta.1'
    if (kind === 'bad-version') test.release.tag_name = 'v01.2.3'
    if (kind === 'commit') test.release.target_commitish = 'b'.repeat(40)
    if (kind === 'metadata-bytes') test.texts.set(4, '{}')
    if (kind === 'checksum-bytes') test.texts.set(5, 'wrong checksums')
    if (kind === 'oversize') {
      const entry = test.release.assets.find((asset) => asset.id === 4)
      if (entry === undefined) throw new Error('Missing metadata.')
      entry.size = 100_000
    }
    if (kind === 'stale-list')
      test.remote.list = () => Promise.resolve([{ ...test.release, id: 99 }])
    await expect(discoverPublishedRelease(test.remote, now)).rejects.toThrow()
  })

  it('never emits a public feed from preview data', () => {
    expect(() =>
      versionFeed({ schemaVersion: 1, source: 'preview', generatedAt: now, stable: null })
    ).toThrow('preview')
  })

  it.each([
    'metadata-version',
    'metadata-commit',
    'metadata-inventory',
    'installer-size',
    'checksums'
  ])(
    'rejects internally inconsistent %s even when downloaded metadata matches its API digest',
    async (kind) => {
      const test = fixture()
      if (kind === 'metadata-version') test.metadata.version = '0.2.0'
      if (kind === 'metadata-commit') test.metadata.commit = 'b'.repeat(40)
      if (kind === 'metadata-inventory') test.metadata.assets.pop()
      if (kind === 'installer-size') {
        const first = test.metadata.assets[0]
        if (first === undefined) throw new Error('Missing test asset.')
        first.size += 1
      }
      if (kind === 'checksums') test.setText(5, 'a'.repeat(64) + '  incorrect.exe\n')
      else test.setText(4, JSON.stringify(test.metadata))
      await expect(discoverPublishedRelease(test.remote, now)).rejects.toThrow(/disagree|mismatch/)
    }
  )
})
