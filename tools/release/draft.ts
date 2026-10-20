import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import {
  closeSync,
  createReadStream,
  lstatSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { z } from 'zod'
import { checkReleaseIdentity, releaseNotes, validateReleaseVersion } from './release.ts'

const contextSchema = z.object({
  version: z.string().refine(validateReleaseVersion),
  tag: z.string(),
  commit: z.string().regex(/^[a-f0-9]{40}$/),
  repository: z.literal('mooeypoo/plotdevice'),
  runId: z.string().regex(/^[1-9]\d*$/)
})
type ReleaseContext = z.infer<typeof contextSchema>
const assetSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  size: z.number().int().nonnegative(),
  state: z.literal('uploaded')
})
const draftSchema = z.object({
  id: z.number().int().positive(),
  tag_name: z.string(),
  target_commitish: z.string(),
  draft: z.boolean(),
  prerelease: z.boolean(),
  body: z.string().nullable(),
  assets: z.array(assetSchema)
})
type Draft = z.infer<typeof draftSchema>

/** The minimal remote operations needed to assemble, but never publish, a draft. */
export interface DraftRemote {
  find(): Promise<Draft | undefined>
  create(notes: string): Promise<void>
  upload(path: string): Promise<void>
  download(assetId: number, path: string): Promise<void>
}

/** Returns the exact x64 installer inventory; architecture policy is explicit in CI. */
export function installerNames(version: string): string[] {
  if (!validateReleaseVersion(version)) throw new Error('Invalid installer version.')
  return [
    `plotdevice-${version}.AppImage`,
    `plotdevice_${version}_amd64.deb`,
    `plotdevice-${version}-setup.exe`
  ]
}

async function digest(path: string): Promise<string> {
  const hash = createHash('sha256')
  const stream: AsyncIterable<unknown> = createReadStream(path)
  for await (const chunk of stream) {
    if (!Buffer.isBuffer(chunk)) throw new Error('Expected binary asset bytes.')
    hash.update(chunk)
  }
  return hash.digest('hex')
}

/** Assembles a complete draft, resuming only when existing asset bytes match this build. */
export async function assembleDraft(
  context: ReleaseContext,
  directory: string,
  notes: string,
  remote: DraftRemote
): Promise<void> {
  contextSchema.parse(context)
  if (context.tag !== `v${context.version}`) throw new Error('Tag/version mismatch.')
  const names = installerNames(context.version)
  const actualNames = readdirSync(directory).sort()
  if (JSON.stringify(actualNames) !== JSON.stringify([...names].sort())) {
    throw new Error(`Expected exactly these installers: ${names.join(', ')}.`)
  }
  const assets = await Promise.all(
    names.map(async (name) => {
      const path = join(directory, name)
      const stat = lstatSync(path)
      if (!stat.isFile() || stat.size === 0) throw new Error(`Invalid or empty installer: ${name}.`)
      return { name, size: stat.size, sha256: await digest(path) }
    })
  )
  const staging = mkdtempSync(join(tmpdir(), 'plotdevice-draft-'))
  try {
    const metadata = {
      schemaVersion: 1,
      ...context,
      architecture: 'x64',
      fileFormat: 1,
      buildUrl: `https://github.com/${context.repository}/actions/runs/${context.runId}`,
      assets
    }
    writeFileSync(join(staging, 'release-metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`)
    const metadataHash = await digest(join(staging, 'release-metadata.json'))
    writeFileSync(
      join(staging, 'SHA256SUMS'),
      [...assets, { name: 'release-metadata.json', sha256: metadataHash }]
        .map((asset) => `${asset.sha256}  ${asset.name}\n`)
        .join('')
    )
    const files = new Map(names.map((name) => [name, join(directory, name)]))
    files.set('release-metadata.json', join(staging, 'release-metadata.json'))
    files.set('SHA256SUMS', join(staging, 'SHA256SUMS'))
    const expectedNotes = `${notes.trim()}\n\nBuild commit: ${context.commit}\nBuild run: ${metadata.buildUrl}`
    function verifyIdentity(value: Draft): void {
      if (
        !value.draft ||
        value.tag_name !== context.tag ||
        value.target_commitish !== context.commit ||
        value.prerelease !== context.version.includes('-') ||
        value.body?.trim() !== expectedNotes
      ) {
        throw new Error(
          'Release is published or its tag/commit/channel/notes differ; refusing mutation.'
        )
      }
      if (value.assets.some((asset) => !files.has(asset.name))) {
        throw new Error('Draft contains unexpected assets; review it manually before retrying.')
      }
      if (new Set(value.assets.map((asset) => asset.name)).size !== value.assets.length) {
        throw new Error('Draft contains duplicate assets.')
      }
    }
    async function verifyAssets(value: Draft): Promise<void> {
      for (const asset of value.assets) {
        const local = files.get(asset.name)
        if (local === undefined) throw new Error('Unexpected asset.')
        const downloaded = join(staging, `download-${String(asset.id)}`)
        await remote.download(asset.id, downloaded)
        if (
          lstatSync(local).size !== asset.size ||
          (await digest(local)) !== (await digest(downloaded))
        ) {
          throw new Error(`Existing asset ${asset.name} differs; no assets will be overwritten.`)
        }
        rmSync(downloaded)
      }
    }
    let draft = await remote.find()
    if (draft !== undefined) {
      verifyIdentity(draft)
      await verifyAssets(draft)
    } else {
      await remote.create(expectedNotes)
      draft = await remote.find()
      if (draft === undefined) throw new Error('Created draft could not be found.')
      verifyIdentity(draft)
      await verifyAssets(draft)
    }
    for (const [name, path] of files) {
      if (!draft.assets.some((asset) => asset.name === name)) await remote.upload(path)
    }
    const complete = await remote.find()
    if (complete === undefined) throw new Error('Draft disappeared during upload.')
    verifyIdentity(complete)
    if (complete.assets.length !== files.size)
      throw new Error('Draft asset inventory is incomplete.')
    await verifyAssets(complete)
  } finally {
    rmSync(staging, { recursive: true })
  }
}

function git(...args: string[]): string {
  return execFileSync('git', args, { encoding: 'utf8' }).trim()
}

function loadContext(): ReleaseContext {
  const manifest: unknown = JSON.parse(readFileSync('package.json', 'utf8'))
  const version = z.object({ version: z.string() }).parse(manifest).version
  const context = contextSchema.parse({
    version,
    tag: process.env.GITHUB_REF_NAME,
    commit: process.env.GITHUB_SHA,
    repository: process.env.GITHUB_REPOSITORY,
    runId: process.env.GITHUB_RUN_ID
  })
  if (process.env.GITHUB_EVENT_NAME !== 'push' || process.env.GITHUB_REF_TYPE !== 'tag') {
    throw new Error('Draft release tooling runs only for a pushed version tag.')
  }
  const errors = checkReleaseIdentity({
    manifest,
    lockfile: JSON.parse(readFileSync('package-lock.json', 'utf8')) as unknown,
    changelog: readFileSync('CHANGELOG.md', 'utf8'),
    tag: context.tag
  })
  if (errors.length > 0) throw new Error(errors.join('\n'))
  if (
    git('rev-parse', 'HEAD') !== context.commit ||
    git('rev-parse', `${context.tag}^{commit}`) !== context.commit
  ) {
    throw new Error('Checkout, tag, and event commit must agree.')
  }
  if (git('cat-file', '-t', `refs/tags/${context.tag}`) !== 'tag') {
    throw new Error('Release tags must be annotated.')
  }
  git('merge-base', '--is-ancestor', context.commit, 'origin/main')
  return context
}

function githubRemote(context: ReleaseContext): DraftRemote {
  const endpoint = `repos/${context.repository}`
  const gh = (...args: string[]): string =>
    execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
  return {
    find() {
      const pages: unknown = JSON.parse(
        gh('api', `${endpoint}/releases?per_page=100`, '--paginate', '--slurp')
      )
      const releases = z.array(z.array(draftSchema)).parse(pages).flat()
      const matches = releases.filter((release) => release.tag_name === context.tag)
      if (matches.length > 1) throw new Error('Multiple releases have the same tag.')
      return Promise.resolve(matches[0])
    },
    create(notes) {
      gh(
        'release',
        'create',
        context.tag,
        '--repo',
        context.repository,
        '--draft',
        '--verify-tag',
        '--target',
        context.commit,
        '--latest=false',
        '--title',
        `Plot Device ${context.version}`,
        '--notes',
        notes,
        ...(context.version.includes('-') ? ['--prerelease'] : [])
      )
      return Promise.resolve()
    },
    upload(path) {
      gh('release', 'upload', context.tag, path, '--repo', context.repository)
      return Promise.resolve()
    },
    download(assetId, path) {
      const fd = openSync(path, 'wx')
      try {
        execFileSync(
          'gh',
          [
            'api',
            `${endpoint}/releases/assets/${String(assetId)}`,
            '-H',
            'Accept: application/octet-stream'
          ],
          {
            stdio: ['ignore', fd, 'pipe']
          }
        )
      } finally {
        closeSync(fd)
      }
      return Promise.resolve()
    }
  }
}

async function main(): Promise<void> {
  const [command, directory, ...extra] = process.argv.slice(2)
  if (
    !['validate', 'assemble'].includes(command ?? '') ||
    extra.length > 0 ||
    (command === 'validate' && directory !== undefined) ||
    (command === 'assemble' && directory === undefined)
  ) {
    throw new Error('Usage: draft.ts validate | assemble <installer-directory>')
  }
  const context = loadContext()
  if (command === 'validate') {
    console.log(`Validated annotated ${context.tag} at ${context.commit} on origin/main.`)
    return
  }
  // Check the current remote tag as well as the event checkout before remote mutation.
  const remoteCommit = execFileSync(
    'gh',
    ['api', `repos/${context.repository}/commits/${context.tag}`, '--jq', '.sha'],
    { encoding: 'utf8' }
  ).trim()
  if (remoteCommit !== context.commit) throw new Error('Remote tag changed or is missing.')
  const notes = releaseNotes(readFileSync('CHANGELOG.md', 'utf8'), context.version)
  if ('error' in notes) throw new Error(notes.error)
  await assembleDraft(context, resolve(directory ?? ''), notes.notes, githubRemote(context))
  console.log(
    `Complete unpublished draft for ${context.tag}; installer QA and maintainer publication still required.`
  )
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  void main().catch((error: unknown) => {
    console.error('Draft release failed:', error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
