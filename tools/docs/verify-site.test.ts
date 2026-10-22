import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { publicPages, verifyReleaseOutput, verifySite } from './verify-site'
import type { ReleaseState } from '../release/published-release'

const directories: string[] = []
afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true })
})

it('keeps automatic Pages behind an explicit public launch gate and manual preview nondeploying', () => {
  const text = readFileSync('.github/workflows/pages.yml', 'utf8')
  const workflow: unknown = parse(text)
  expect(workflow).toMatchObject({
    on: { workflow_dispatch: { inputs: { deploy: { type: 'boolean', default: false } } } },
    permissions: { contents: 'read' },
    concurrency: { group: 'plotdevice-pages', 'cancel-in-progress': false },
    jobs: {
      deploy: {
        needs: 'build',
        permissions: { contents: 'read', pages: 'write', 'id-token': 'write' },
        environment: { name: 'github-pages' }
      }
    }
  })
  expect(text).toContain("vars.PAGES_DEPLOYMENT_APPROVED == 'true'")
  expect(text).toContain('!github.event.repository.private')
  expect(text).toContain("inputs.deploy && github.ref == 'refs/heads/main'")
  expect(text).toContain('ref: main')
  expect(text).toContain('types: [published, unpublished, edited, deleted]')
  expect(text).toContain("cron: '23 6 * * *'")
  expect(text).toContain('release-data.ts fresh')
  expect(text).toContain('verify-deployment.ts')
  expect(text).toContain('npm run docs:build:published')
  expect(text).not.toMatch(/uses: actions\/[\w-]+@v/)
  expect(readFileSync('.github/workflows/ci.yml', 'utf8')).toContain('npm run docs:build')
})

describe('site/feed consistency', () => {
  const state: ReleaseState = {
    schemaVersion: 1,
    source: 'github',
    generatedAt: '2026-10-20T12:00:00.000Z',
    stable: null
  }
  it('accepts explicit no-stable feed only from authenticated discovery', () => {
    const directory = fixture()
    mkdirSync(join(directory, 'updates/v1'), { recursive: true })
    writeFileSync(
      join(directory, 'updates/v1/latest.json'),
      JSON.stringify({
        schemaVersion: 1,
        generatedAt: state.generatedAt,
        stable: null
      })
    )
    expect(() => {
      verifyReleaseOutput(directory, state)
    }).not.toThrow()
    expect(() => {
      verifyReleaseOutput(directory, { ...state, source: 'preview' })
    }).toThrow('preview')
  })

  it('refuses missing or stale feed data instead of passing a preview off as published', () => {
    const directory = fixture()
    expect(() => {
      verifyReleaseOutput(directory, state)
    }).toThrow()
    mkdirSync(join(directory, 'updates/v1'), { recursive: true })
    writeFileSync(
      join(directory, 'updates/v1/latest.json'),
      JSON.stringify({
        schemaVersion: 1,
        generatedAt: '2025-01-01T00:00:00.000Z',
        stable: null
      })
    )
    expect(() => {
      verifyReleaseOutput(directory, state)
    }).toThrow('does not match')
  })

  it('requires all stable download links in the rendered page, not just a correct JSON feed', () => {
    const directory = fixture()
    const version = '0.1.0'
    const tag = `v${version}`
    const stable: ReleaseState = {
      ...state,
      stable: {
        version,
        tag,
        publishedAt: state.generatedAt,
        releaseUrl: `https://github.com/mooeypoo/plotdevice/releases/tag/${tag}`,
        downloads: [
          `plotdevice-${version}.AppImage`,
          `plotdevice_${version}_amd64.deb`,
          'release-metadata.json',
          'SHA256SUMS'
        ].map((name) => ({
          name,
          size: 123,
          sha256: 'a'.repeat(64),
          url: `https://github.com/mooeypoo/plotdevice/releases/download/${tag}/${name}`
        }))
      }
    }
    mkdirSync(join(directory, 'updates/v1'), { recursive: true })
    writeFileSync(
      join(directory, 'updates/v1/latest.json'),
      JSON.stringify({
        schemaVersion: 1,
        generatedAt: state.generatedAt,
        stable: {
          version,
          tag,
          publishedAt: state.generatedAt,
          releaseUrl: stable.stable?.releaseUrl
        }
      })
    )
    expect(() => {
      verifyReleaseOutput(directory, stable)
    }).toThrow('missing the verified published asset')
    writeFileSync(
      join(directory, 'download.html'),
      stable.stable?.downloads
        .map((asset) => `<a href="${asset.url}">${asset.name}</a>`)
        .join('\n') ?? ''
    )
    expect(() => {
      verifyReleaseOutput(directory, stable)
    }).not.toThrow()
  })
})

function fixture(): string {
  const directory = mkdtempSync(join(tmpdir(), 'plotdevice-docs-'))
  directories.push(directory)
  for (const page of publicPages) {
    const path = join(directory, page)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, '<html><h1 id="hello">Hello</h1></html>')
  }
  return directory
}

describe('documentation publication checks', () => {
  it('accepts exact public pages and valid base-relative, encoded, fragment, and external links', () => {
    expect(publicPages).toContain('guide/translation.html')
    const directory = fixture()
    writeFileSync(
      join(directory, 'index.html'),
      `<a href="/plotdevice/guide/start.html#hello">Start</a>
      <a href="https://github.com/mooeypoo/plotdevice">Source</a>
      <img src="/plotdevice/test%20image.svg">
      <img src="data:image/svg+xml,test">
      <a href="/plotdevice/updates.html?one=1&amp;two=2#hello">Updates</a>`
    )
    writeFileSync(join(directory, 'test image.svg'), '<svg/>')
    expect(verifySite(directory)).toEqual([])
  })

  it('rejects internal planning pages even if no sidebar points to them', () => {
    const directory = fixture()
    writeFileSync(join(directory, 'release-plan.html'), 'Internal')
    expect(verifySite(directory).join('\n')).toContain('inventory differs')
  })

  it('rejects missing pages, fragments, assets, and URLs outside the project base', () => {
    const directory = fixture()
    writeFileSync(
      join(directory, 'guide/start.html'),
      `<a href="../download.html#missing">Broken fragment</a>
      <a href="/download.html">Wrong base</a><img src="../missing.png">
      <a href="../missing.html">Missing page</a>`
    )
    const errors = verifySite(directory).join('\n')
    expect(errors).toContain('Missing fragment')
    expect(errors).toContain('escapes the Pages base')
    expect(errors).toContain('Missing local target: ../missing.png')
    expect(errors).toContain('Missing local target: ../missing.html')
  })

  it('rejects removal of an expected page', () => {
    const directory = fixture()
    rmSync(join(directory, 'file-format.html'))
    expect(verifySite(directory).join('\n')).toContain('inventory differs')
  })
})
