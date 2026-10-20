import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { z } from 'zod'

const packageSchema = z.object({
  name: z.literal('plotdevice'),
  version: z.string()
})
const lockfileSchema = packageSchema.extend({
  packages: z.object({ '': packageSchema })
})
const versionPattern =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/

/** Accepts release versions without a tag prefix or build metadata. */
export function validateReleaseVersion(version: string): boolean {
  if (version.length > 128 || version.trim() !== version || !versionPattern.test(version)) {
    return false
  }
  const prerelease = version.split('-').slice(1).join('-')
  return prerelease.split('.').every((part) => !/^\d+$/.test(part) || !/^0\d/.test(part))
}

/** Extracts one dated, nonempty changelog section without including adjacent releases. */
export function releaseNotes(
  changelog: string,
  version: string
): { notes: string } | { error: string } {
  if (!validateReleaseVersion(version)) return { error: `Invalid release version: ${version}.` }
  const sections = changelog.replace(/\r\n/g, '\n').split(/^## /m)
  const matches = sections.slice(1).filter((section) => section.startsWith(`[${version}]`))
  if (matches.length !== 1) {
    return { error: `CHANGELOG.md must contain exactly one dated [${version}] section.` }
  }
  const section = matches[0]
  const heading = section?.split('\n')[0] ?? ''
  const date = heading.slice(`[${version}] - `.length)
  const parsedDate = new Date(`${date}T00:00:00Z`)
  if (
    heading !== `[${version}] - ${date}` ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== date
  ) {
    return { error: `CHANGELOG.md [${version}] needs a real YYYY-MM-DD release date.` }
  }
  const notes = section?.slice(heading.length).trim() ?? ''
  if (!notes.split('\n').some((line) => line.trim() !== '' && !line.startsWith('#'))) {
    return { error: `CHANGELOG.md [${version}] has no release notes.` }
  }
  return { notes }
}

interface ReleaseSnapshot {
  readonly manifest: unknown
  readonly lockfile: unknown
  readonly changelog: string
  readonly tag: string
  readonly tags: readonly string[]
  readonly dirty: boolean
}

/** Reports local release blockers; it does not certify remote or installer readiness. */
export function checkRelease(snapshot: ReleaseSnapshot): string[] {
  const manifest = packageSchema.safeParse(snapshot.manifest)
  const lockfile = lockfileSchema.safeParse(snapshot.lockfile)
  if (!manifest.success || !lockfile.success) {
    return ['Invalid plotdevice package metadata or lockfile root package metadata.']
  }
  const { version } = manifest.data
  const errors: string[] = []
  if (!validateReleaseVersion(version)) errors.push(`Invalid release version: ${version}.`)
  if (snapshot.tag !== `v${version}`) {
    errors.push(`Tag must be v${version}, not ${snapshot.tag}.`)
  }
  if (lockfile.data.version !== version) errors.push('Lockfile version must match package.json.')
  if (lockfile.data.packages[''].version !== version) {
    errors.push('Lockfile root package version must match package.json.')
  }
  const notes = releaseNotes(snapshot.changelog, version)
  if ('error' in notes) errors.push(notes.error)
  if (snapshot.tags.includes(snapshot.tag)) {
    errors.push(`Local tag ${snapshot.tag} already exists; never reuse a release tag.`)
  }
  if (snapshot.dirty) {
    errors.push('Working tree is not clean; review and commit release preparation first.')
  }
  return errors
}

function git(...args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown
}

const checklist = `
Release checklist (local helper only)
1. Read docs/releasing.md and docs/release-plan.md. Resolve the signing/OS/publication gates.
2. Preview preparation: npm run release:prepare -- <version>
3. Update package metadata and curate/date the matching CHANGELOG.md section.
4. Run npm run lint && npm run typecheck && npm run test && npx electron-vite build
5. Review and commit preparation. Run npm run release:check
6. Check remote tags/releases and the reviewed commit; local checks do not query GitHub.
7. STOP: draft-release automation is not implemented yet. Do not push a tag to publish.
8. When implemented: build draft, verify hashes, test actual Linux/Windows installers and upgrades.
9. Maintainer explicitly publishes; verify public downloads, Pages, and version JSON.

No files changed; no commit, tag, push, network request, or publication performed.
`

function main(args: string[]): void {
  const [command = 'guide', argument, ...extra] = args
  if (
    extra.length > 0 ||
    !['guide', 'prepare', 'check', 'notes'].includes(command) ||
    (command === 'guide' && argument !== undefined)
  ) {
    throw new Error(
      'Usage: release.ts guide | prepare <version> | check [v<version>] | notes [version]'
    )
  }
  if (command === 'guide') {
    console.log(checklist)
    return
  }
  const manifest = packageSchema.parse(readJson('package.json'))
  if (command === 'prepare') {
    if (argument === undefined || !validateReleaseVersion(argument)) {
      throw new Error(
        'prepare requires a version such as 0.1.0-beta.1 (no v prefix or build metadata).'
      )
    }
    if (git('tag', '--list').split('\n').includes(`v${argument}`)) {
      throw new Error(`Local tag v${argument} already exists; choose a new version.`)
    }
    const versionStep =
      manifest.version === argument
        ? 'package.json already has this version; verify matching lockfile metadata with release:check.'
        : `Run after review:
  npm version ${argument} --no-git-tag-version --ignore-scripts

This updates package.json and root package-lock.json version metadata only.`
    console.log(`Preparation preview: ${manifest.version} -> ${argument}

${versionStep}
Move the applicable Unreleased notes into:
  ## [${argument}] - YYYY-MM-DD
Use the intended release date, retain an Unreleased heading, and review the diff.
Do not replace an existing version section or include unrelated future work.
Expected tag later: v${argument}
Channel: ${argument.includes('-') ? 'prerelease (not latest stable)' : 'stable'}
${checklist}`)
    return
  }
  const changelog = readFileSync('CHANGELOG.md', 'utf8')
  if (command === 'notes') {
    const notes = releaseNotes(changelog, argument ?? manifest.version)
    if ('error' in notes) throw new Error(notes.error)
    console.log(notes.notes)
    return
  }
  const errors = checkRelease({
    manifest,
    lockfile: readJson('package-lock.json'),
    changelog,
    tag: argument ?? `v${manifest.version}`,
    tags: git('tag', '--list').split('\n'),
    dirty: git('status', '--porcelain').length > 0
  })
  if (errors.length > 0) throw new Error(errors.map((error) => `- ${error}`).join('\n'))
  console.log(`Local preparation checks passed for v${manifest.version}.
This does NOT verify remote tags, CI, signatures, installer QA, or publication readiness.
Next: follow docs/releasing.md; publication remains a maintainer action.`)
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    main(process.argv.slice(2))
  } catch (error: unknown) {
    console.error('Release helper failed:', error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
