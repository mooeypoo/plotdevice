import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { assembleDraft, installerNames, type DraftRemote } from './draft'
import { checkReleaseIdentity } from './release'

const context = {
  version: '0.1.0-beta.1',
  tag: 'v0.1.0-beta.1',
  commit: 'a'.repeat(40),
  repository: 'mooeypoo/plotdevice' as const,
  runId: '123'
}
const directories: string[] = []
const notes = '### Added\n\n- An actual release.'

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true })
})

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), 'plotdevice-installers-'))
  directories.push(directory)
  for (const name of installerNames(context.version)) {
    writeFileSync(join(directory, name), `installer bytes for ${name}`)
  }
  let draft: Awaited<ReturnType<DraftRemote['find']>>
  const bytes = new Map<number, Buffer>()
  let uploads = 0
  let failAt = Infinity
  const remote: DraftRemote = {
    find: () => Promise.resolve(draft),
    create(body) {
      draft = {
        id: 1,
        tag_name: context.tag,
        target_commitish: context.commit,
        draft: true,
        prerelease: true,
        body,
        assets: []
      }
      return Promise.resolve()
    },
    upload(path) {
      if (uploads === failAt) throw new Error('Simulated interrupted upload.')
      if (draft === undefined) throw new Error('No draft.')
      const name = basename(path)
      if (draft.assets.some((asset) => asset.name === name)) throw new Error('No overwrites.')
      const content = readFileSync(path)
      const id = uploads + 1
      bytes.set(id, content)
      draft.assets.push({ id, name, size: content.length, state: 'uploaded' })
      uploads += 1
      return Promise.resolve()
    },
    download(id, path) {
      const content = bytes.get(id)
      if (content === undefined) throw new Error('Asset missing.')
      writeFileSync(path, content)
      return Promise.resolve()
    }
  }
  return {
    directory,
    remote,
    bytes,
    get draft() {
      return draft
    },
    get uploads() {
      return uploads
    },
    failAfter(count: number) {
      failAt = count
    }
  }
}

describe('draft release assembly', () => {
  it('defines only the approved Linux x64 installers', () => {
    expect(installerNames(context.version)).toEqual([
      'plotdevice-0.1.0-beta.1.AppImage',
      'plotdevice_0.1.0-beta.1_amd64.deb'
    ])
  })

  it('uploads exactly two Linux installers, deterministic metadata and matching checksums, never publishing', async () => {
    const test = fixture()
    await assembleDraft(context, test.directory, notes, test.remote)
    expect(test.draft?.draft).toBe(true)
    expect(test.draft?.prerelease).toBe(true)
    expect(test.draft?.assets.map((asset) => asset.name)).toEqual([
      ...installerNames(context.version),
      'release-metadata.json',
      'SHA256SUMS'
    ])
    const metadata = test.draft?.assets.find((asset) => asset.name === 'release-metadata.json')
    const content = test.bytes.get(metadata?.id ?? 0)?.toString() ?? ''
    expect(JSON.parse(content)).toMatchObject({
      commit: context.commit,
      version: context.version,
      runId: '123',
      architecture: 'x64',
      platforms: ['linux'],
      fileFormat: 1
    })
    const sums = test.draft?.assets.find((asset) => asset.name === 'SHA256SUMS')
    const lines =
      test.bytes
        .get(sums?.id ?? 0)
        ?.toString()
        .trim()
        .split('\n') ?? []
    expect(lines).toHaveLength(3)
    for (const line of lines) {
      const [hash, name] = line.split('  ')
      const asset = test.draft?.assets.find((candidate) => candidate.name === name)
      const assetBytes = test.bytes.get(asset?.id ?? 0)
      if (assetBytes === undefined) throw new Error('Missing checksum target.')
      expect(hash).toBe(createHash('sha256').update(assetBytes).digest('hex'))
    }
    expect(readdirSync(test.directory)).toHaveLength(2)
    await assembleDraft(context, test.directory, notes, test.remote)
    expect(test.uploads).toBe(4)
  })

  it('resumes an interrupted draft without overwriting matching existing assets', async () => {
    const test = fixture()
    test.failAfter(2)
    await expect(assembleDraft(context, test.directory, notes, test.remote)).rejects.toThrow(
      'interrupted'
    )
    expect(test.draft?.assets).toHaveLength(2)
    test.failAfter(Infinity)
    await assembleDraft(context, test.directory, notes, test.remote)
    expect(test.uploads).toBe(4)
  })

  it.each(['published', 'commit', 'notes', 'channel', 'unexpected', 'bytes', 'run'])(
    'refuses %s mismatch before any additional uploads',
    async (kind) => {
      const test = fixture()
      await assembleDraft(context, test.directory, notes, test.remote)
      const draft = test.draft
      if (draft === undefined) throw new Error('Missing test draft.')
      if (kind === 'published') draft.draft = false
      if (kind === 'commit') draft.target_commitish = 'b'.repeat(40)
      if (kind === 'notes') draft.body = 'Changed notes'
      if (kind === 'channel') draft.prerelease = false
      if (kind === 'unexpected')
        draft.assets.push({ id: 99, name: 'surprise.exe', size: 1, state: 'uploaded' })
      if (kind === 'bytes') test.bytes.set(1, Buffer.from('different installer'))
      await expect(
        assembleDraft(
          kind === 'run' ? { ...context, runId: '456' } : context,
          test.directory,
          notes,
          test.remote
        )
      ).rejects.toThrow()
      expect(test.uploads).toBe(4)
    }
  )

  it.each(['missing', 'extra', 'empty', 'windows'])(
    'rejects %s installer inventory without creating a release',
    async (kind) => {
      const test = fixture()
      const name = installerNames(context.version)[0]
      if (name === undefined) throw new Error('Missing name.')
      if (kind === 'missing') rmSync(join(test.directory, name))
      if (kind === 'extra') writeFileSync(join(test.directory, 'surprise.exe'), 'extra')
      if (kind === 'windows')
        writeFileSync(
          join(test.directory, `plotdevice-${context.version}-setup.exe`),
          'unqualified'
        )
      if (kind === 'empty') writeFileSync(join(test.directory, name), '')
      await expect(assembleDraft(context, test.directory, notes, test.remote)).rejects.toThrow()
      expect(test.draft).toBeUndefined()
    }
  )

  it('rejects tag mismatch and malformed version before remote mutation', async () => {
    const test = fixture()
    await expect(
      assembleDraft({ ...context, tag: 'v0.2.0' }, test.directory, notes, test.remote)
    ).rejects.toThrow()
    expect(() => installerNames('../bad')).toThrow()
    expect(test.draft).toBeUndefined()
  })

  it('does not treat discovery errors as an absent release', async () => {
    const test = fixture()
    test.remote.find = () => Promise.reject(new Error('GitHub unavailable'))
    await expect(assembleDraft(context, test.directory, notes, test.remote)).rejects.toThrow(
      'GitHub unavailable'
    )
    expect(test.draft).toBeUndefined()
  })
})

describe('CI release identity CLI', () => {
  it.each(['valid', 'lightweight', 'off-main', 'mismatch', 'manual'])(
    'validates %s annotated release context in a temporary repository',
    (kind) => {
      const directory = mkdtempSync(join(tmpdir(), 'plotdevice-tag-validation-'))
      directories.push(directory)
      const git = (...args: string[]) =>
        execFileSync(
          'git',
          ['-c', 'user.name=Release Test', '-c', 'user.email=release@example.invalid', ...args],
          {
            cwd: directory,
            encoding: 'utf8'
          }
        ).trim()
      git('init', '--quiet')
      writeFileSync(
        join(directory, 'package.json'),
        JSON.stringify({ name: 'plotdevice', version: context.version })
      )
      writeFileSync(
        join(directory, 'package-lock.json'),
        JSON.stringify({
          name: 'plotdevice',
          version: context.version,
          packages: { '': { name: 'plotdevice', version: context.version } }
        })
      )
      writeFileSync(
        join(directory, 'CHANGELOG.md'),
        `## [${context.version}] - 2026-10-20\n\n${notes}`
      )
      git('add', '.')
      git('commit', '-qm', 'Candidate')
      git('update-ref', 'refs/remotes/origin/main', 'HEAD')
      if (kind === 'off-main') {
        writeFileSync(join(directory, 'later.txt'), 'not on main')
        git('add', '.')
        git('commit', '-qm', 'Not on main')
      }
      git(
        'tag',
        ...(kind === 'lightweight' ? [context.tag] : ['-a', context.tag, '-m', 'Candidate'])
      )
      const result = spawnSync(
        process.execPath,
        ['--experimental-strip-types', resolve('tools/release/draft.ts'), 'validate'],
        {
          cwd: directory,
          encoding: 'utf8',
          env: {
            ...process.env,
            GITHUB_REF_NAME: context.tag,
            GITHUB_SHA: kind === 'mismatch' ? 'b'.repeat(40) : git('rev-parse', 'HEAD'),
            GITHUB_REPOSITORY: context.repository,
            GITHUB_RUN_ID: context.runId,
            GITHUB_REF_TYPE: 'tag',
            GITHUB_EVENT_NAME: kind === 'manual' ? 'workflow_dispatch' : 'push'
          }
        }
      )
      expect(result.status).toBe(kind === 'valid' ? 0 : 1)
      if (kind !== 'valid') expect(result.stderr).toContain('Draft release failed:')
    }
  )
})

it('shares identity checks with CI without rejecting the existing tag or generated files', () => {
  expect(
    checkReleaseIdentity({
      manifest: { name: 'plotdevice', version: context.version },
      lockfile: {
        name: 'plotdevice',
        version: context.version,
        packages: { '': { name: 'plotdevice', version: context.version } }
      },
      tag: context.tag,
      changelog: `## [${context.version}] - 2026-10-20\n\n${notes}`
    })
  ).toEqual([])
})

describe('release workflow wiring', () => {
  it('keeps both platform checks, packages only Linux on tags, and gates remote writes', () => {
    const workflow: unknown = parse(readFileSync('.github/workflows/ci.yml', 'utf8'))
    expect(workflow).toMatchObject({
      permissions: { contents: 'read' },
      jobs: {
        checks: { strategy: { matrix: { os: ['ubuntu-latest', 'windows-latest'] } } },
        build: { needs: 'checks' },
        'draft-release': {
          needs: 'build',
          if: "github.event_name == 'push' && startsWith(github.ref, 'refs/tags/v')",
          permissions: { contents: 'write' }
        }
      }
    })
    const text = readFileSync('.github/workflows/ci.yml', 'utf8')
    expect(text).toContain("github.event_name == 'workflow_dispatch' && fromJSON")
    expect(text).toContain('|| fromJSON(\'["ubuntu-latest"]\')')
    expect(text).toContain('-- --x64')
    expect(text).toContain('name: plotdevice-Linux')
    expect(text).not.toMatch(/uses: actions\/[\w-]+@v/)
    expect(text).toContain('cancel-in-progress: ${{ !startsWith(github.ref')
  })
})
