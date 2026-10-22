import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'
import { afterEach, describe, expect, it } from 'vitest'
import { checkRelease, releaseNotes, validateReleaseVersion } from './release'

const directories: string[] = []
const version = '0.1.0-beta.1'
const changelog = `# Changelog

## [Unreleased]

## [${version}] - 2026-10-20

### Added

- Write chapters in Markdown.
`
const metadata = {
  manifest: { name: 'plotdevice', version },
  lockfile: { name: 'plotdevice', version, packages: { '': { name: 'plotdevice', version } } },
  changelog,
  tag: `v${version}`,
  tags: [] as string[],
  dirty: false
}

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true })
})

describe('release version policy', () => {
  it.each(['0.1.0', version, '1.2.3-rc.10', '0.2.0-alpha'])('accepts %s', (candidate) => {
    expect(validateReleaseVersion(candidate)).toBe(true)
  })

  it.each([
    'v0.1.0',
    '01.2.3',
    '1.2',
    '1.2.3-01',
    '1.2.3-beta.01',
    '1.2.3-',
    '1.2.3+build',
    '1.2.3\n',
    '1.2.3; echo unexpected'
  ])('rejects unsupported or unsafe version %j', (candidate) => {
    expect(validateReleaseVersion(candidate)).toBe(false)
  })
})

describe('release notes', () => {
  it('extracts only the requested dated section, preserving its content', () => {
    expect(releaseNotes(`${changelog}\n## [0.0.1] - 2026-09-01\n\nOld\n`, version)).toEqual({
      notes: '### Added\n\n- Write chapters in Markdown.'
    })
  })

  it.each([
    '# Changelog\n\n## [Unreleased]\n\n### Added\n\n- Something\n',
    changelog.replace('2026-10-20', '2026-02-30'),
    changelog.replace('- Write chapters in Markdown.', ''),
    `${changelog}\n${changelog}`,
    changelog.replace('2026-10-20', 'Unreleased')
  ])('rejects missing, invalid, empty, or duplicate release sections', (text) => {
    expect(releaseNotes(text, version)).toHaveProperty('error')
  })
})

describe('local release checks', () => {
  it('accepts matching metadata and a dated changelog', () => {
    expect(checkRelease(metadata)).toEqual([])
  })

  it('reports mismatched tag, manifest, both lockfile versions, reused tag, and dirty tree', () => {
    const errors = checkRelease({
      ...metadata,
      manifest: { name: 'plotdevice', version: '0.2.0' },
      tag: 'v0.3.0',
      tags: ['v0.3.0'],
      dirty: true
    })
    expect(errors).toContain('Tag must be v0.2.0, not v0.3.0.')
    expect(errors).toContain('Lockfile version must match package.json.')
    expect(errors).toContain('Lockfile root package version must match package.json.')
    expect(errors).toContain('Local tag v0.3.0 already exists; never reuse a release tag.')
    expect(errors).toContain(
      'Working tree is not clean; review and commit release preparation first.'
    )
  })

  it('does not accept unrelated or malformed package metadata', () => {
    expect(checkRelease({ ...metadata, lockfile: {} })).toContain(
      'Invalid plotdevice package metadata or lockfile root package metadata.'
    )
  })
})

// These spawn git and node; a busy Windows CI runner can take well over the 5-second default.
describe('release helper CLI', { timeout: 30_000 }, () => {
  function fixture(): string {
    const root = mkdtempSync(join(tmpdir(), 'plotdevice-release-'))
    directories.push(root)
    writeFileSync(join(root, 'package.json'), JSON.stringify(metadata.manifest))
    writeFileSync(join(root, 'package-lock.json'), JSON.stringify(metadata.lockfile))
    writeFileSync(join(root, 'CHANGELOG.md'), changelog)
    execFileSync('git', ['init', '--quiet'], { cwd: root })
    execFileSync('git', ['add', '.'], { cwd: root })
    execFileSync(
      'git',
      [
        '-c',
        'user.name=Release Test',
        '-c',
        'user.email=release@example.invalid',
        'commit',
        '-qm',
        'fixture'
      ],
      { cwd: root }
    )
    return root
  }

  function run(root: string, ...args: string[]) {
    return spawnSync(
      process.execPath,
      ['--experimental-strip-types', resolve('tools/release/release.ts'), ...args],
      { cwd: root, encoding: 'utf8' }
    )
  }

  it('previews preparation without changing files, tags, or commits', () => {
    const root = fixture()
    const before = readFileSync(join(root, 'package.json'), 'utf8')
    const result = run(root, 'prepare', '0.1.0-beta.2')
    expect(result.status).toBe(0)
    expect(result.stdout).toContain(
      'npm version 0.1.0-beta.2 --no-git-tag-version --ignore-scripts'
    )
    expect(result.stdout).toContain('No files changed')
    expect(readFileSync(join(root, 'package.json'), 'utf8')).toBe(before)
    expect(execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' })).toBe('')
    expect(execFileSync('git', ['tag', '--list'], { cwd: root, encoding: 'utf8' })).toBe('')
    expect(
      execFileSync('git', ['rev-list', '--count', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
    ).toBe('1')
  })

  it('checks a clean candidate and refuses a reused tag', () => {
    const root = fixture()
    expect(run(root, 'check').status).toBe(0)
    execFileSync('git', ['tag', `v${version}`], { cwd: root })
    const result = run(root, 'check')
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('already exists')
  })

  it('does not suggest a failing npm version command when the version already matches', () => {
    const result = run(fixture(), 'prepare', version)
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('already has this version')
    expect(result.stdout).not.toContain(`npm version ${version}`)
  })

  it('prints notes without guide text and reports invalid commands explicitly', () => {
    const root = fixture()
    expect(run(root, 'notes').stdout.trim()).toBe('### Added\n\n- Write chapters in Markdown.')
    expect(run(root, 'unknown').status).toBe(1)
    expect(run(root, 'prepare', 'bad').status).toBe(1)
    expect(run(root, 'check', `v${version}`, 'unexpected').status).toBe(1)
  })
})
