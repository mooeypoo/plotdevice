import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { downloadsFrom, RELEASES_FILE } from './site-releases.mjs'

// The download page's list of releases (Milestone 26), from GitHub's.
const asset = (name: string, size = 100) => ({
  name,
  size,
  browser_download_url: `https://github.com/mooeypoo/plotdevice/releases/download/x/${name}`,
})
const release = (tag: string, names: string[], extra: Record<string, unknown> = {}) => ({
  tag_name: tag,
  draft: false,
  prerelease: false,
  published_at: '2026-11-03T15:02:19Z',
  html_url: `https://github.com/mooeypoo/plotdevice/releases/tag/${tag}`,
  assets: names.map((name) => asset(name)),
  ...extra,
})

describe('the download page’s releases', () => {
  it('knows each installer by its name, and leaves out the files that aren’t installers', () => {
    const [only] = downloadsFrom([
      release('v0.3.0', [
        'latest.json',
        'plotdevice-0.3.0-setup.exe',
        'plotdevice-0.3.0.AppImage',
        'plotdevice_0.3.0_amd64.deb',
        'SHA256SUMS',
      ]),
    ])
    expect(only).toEqual({
      version: '0.3.0',
      date: '2026-11-03',
      notes: 'https://github.com/mooeypoo/plotdevice/releases/tag/v0.3.0',
      files: {
        windows: { name: 'plotdevice-0.3.0-setup.exe', url: expect.stringContaining('setup.exe'), size: 100 },
        appimage: { name: 'plotdevice-0.3.0.AppImage', url: expect.stringContaining('.AppImage'), size: 100 },
        deb: { name: 'plotdevice_0.3.0_amd64.deb', url: expect.stringContaining('.deb'), size: 100 },
      },
    })
  })

  it('finds the Mac file once there is one', () => {
    expect(downloadsFrom([release('v0.5.0', ['plotdevice-0.5.0-arm64.dmg'])])[0]?.files.mac?.name).toBe('plotdevice-0.5.0-arm64.dmg')
  })

  it('lists only published releases, newest version first, and none without an installer', () => {
    const list = downloadsFrom([
      release('v0.2.0', ['plotdevice-0.2.0.AppImage']),
      release('v0.10.0', ['plotdevice-0.10.0.AppImage']),
      release('v0.11.0', ['plotdevice-0.11.0.AppImage'], { draft: true }),
      release('v0.12.0', ['plotdevice-0.12.0.AppImage'], { prerelease: true }),
      release('v0.3.0', ['plotdevice-0.3.0.AppImage']),
      release('v0.1.0', ['notes.txt']),
    ])
    expect(list.map((entry) => entry.version)).toEqual(['0.10.0', '0.3.0', '0.2.0'])
  })

  it('the site’s file is in that shape', () => {
    const { releases } = JSON.parse(readFileSync(RELEASES_FILE, 'utf8')) as { releases: { version: string; files: object }[] }
    expect(releases.length).toBeGreaterThan(0)
    for (const entry of releases) expect(Object.keys(entry.files).length).toBeGreaterThan(0)
  })
})
