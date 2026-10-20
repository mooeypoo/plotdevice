import { createHash } from 'node:crypto'
import { z } from 'zod'
import { installerNames } from './draft.ts'
import { validateReleaseVersion } from './release.ts'

export const repository = 'mooeypoo/plotdevice'
const sha256 = z.string().regex(/^[a-f0-9]{64}$/)
const version = z.string().refine((value) => validateReleaseVersion(value) && !value.includes('-'))
const assetSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  size: z.number().int().positive(),
  state: z.literal('uploaded'),
  digest: z.string().regex(/^sha256:[a-f0-9]{64}$/),
  browser_download_url: z.string()
})
const releaseSchema = z.object({
  id: z.number().int().positive(),
  tag_name: z.string(),
  draft: z.literal(false),
  prerelease: z.literal(false),
  published_at: z.iso.datetime(),
  html_url: z.string(),
  target_commitish: z.string().regex(/^[a-f0-9]{40}$/),
  assets: z.array(assetSchema)
})
const metadataSchema = z.object({
  schemaVersion: z.literal(1),
  version,
  tag: z.string(),
  commit: z.string().regex(/^[a-f0-9]{40}$/),
  repository: z.literal(repository),
  runId: z.string().regex(/^[1-9]\d*$/),
  architecture: z.literal('x64'),
  fileFormat: z.literal(1),
  buildUrl: z.string(),
  assets: z.array(z.object({ name: z.string(), size: z.number().int().positive(), sha256 }))
})

const downloadSchema = z.object({
  name: z.string(),
  url: z.url(),
  size: z.number().int().positive(),
  sha256
})
export const stableReleaseSchema = z
  .object({
    version,
    tag: z.string(),
    publishedAt: z.iso.datetime(),
    releaseUrl: z.url(),
    downloads: z.array(downloadSchema).length(5)
  })
  .superRefine((value, ctx) => {
    if (
      value.tag !== `v${value.version}` ||
      value.releaseUrl !== `https://github.com/${repository}/releases/tag/${value.tag}`
    ) {
      ctx.addIssue({ code: 'custom', message: 'Untrusted or mismatched stable release identity.' })
    }
    const expected = [
      ...installerNames(value.version),
      'release-metadata.json',
      'SHA256SUMS'
    ].sort()
    if (
      JSON.stringify(value.downloads.map((asset) => asset.name).sort()) !== JSON.stringify(expected)
    ) {
      ctx.addIssue({ code: 'custom', message: 'Unexpected stable download inventory.' })
    }
    for (const asset of value.downloads) {
      if (
        asset.url !==
        `https://github.com/${repository}/releases/download/${value.tag}/${asset.name}`
      ) {
        ctx.addIssue({ code: 'custom', message: 'Untrusted asset URL.' })
      }
    }
  })
export type StableRelease = z.infer<typeof stableReleaseSchema>
export const releaseStateSchema = z.object({
  schemaVersion: z.literal(1),
  source: z.enum(['preview', 'github']),
  generatedAt: z.iso.datetime(),
  stable: stableReleaseSchema.nullable()
})
export type ReleaseState = z.infer<typeof releaseStateSchema>

/** Small metadata downloads plus GitHub's designated latest release are the publication authority. */
export interface PublishedReleaseRemote {
  list(): Promise<unknown>
  latest(): Promise<unknown>
  asset(id: number): Promise<string>
}

function hash(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

/** Discovers a complete designated stable release; errors never become "no stable release". */
export async function discoverPublishedRelease(
  remote: PublishedReleaseRemote,
  generatedAt: string
): Promise<ReleaseState> {
  const releases = z
    .array(
      z.object({
        id: z.number().int().positive(),
        draft: z.boolean(),
        prerelease: z.boolean(),
        tag_name: z.string()
      })
    )
    .parse(await remote.list())
  const stableCandidates = releases.filter((release) => !release.draft && !release.prerelease)
  if (stableCandidates.length === 0) {
    return releaseStateSchema.parse({
      schemaVersion: 1,
      source: 'github',
      generatedAt,
      stable: null
    })
  }
  const release = releaseSchema.parse(await remote.latest())
  if (
    !stableCandidates.some(
      (candidate) => candidate.id === release.id && candidate.tag_name === release.tag_name
    )
  ) {
    throw new Error(
      'Latest release is absent from the published stable inventory; retry discovery.'
    )
  }
  const stableVersion = release.tag_name.slice(1)
  version.parse(stableVersion)
  const names = [...installerNames(stableVersion), 'release-metadata.json', 'SHA256SUMS']
  if (
    release.tag_name !== `v${stableVersion}` ||
    JSON.stringify(release.assets.map((asset) => asset.name).sort()) !==
      JSON.stringify([...names].sort())
  ) {
    throw new Error('Latest stable release tag or asset inventory is invalid.')
  }
  function asset(name: string) {
    const found = release.assets.find((candidate) => candidate.name === name)
    if (found === undefined) throw new Error(`Missing published asset: ${name}.`)
    return found
  }
  async function metadataText(name: string): Promise<string> {
    const entry = asset(name)
    if (entry.size > 64 * 1024) throw new Error(`Oversized release metadata: ${name}.`)
    const text = await remote.asset(entry.id)
    if (Buffer.byteLength(text) !== entry.size || `sha256:${hash(text)}` !== entry.digest) {
      throw new Error(`Published metadata bytes do not match the asset digest: ${name}.`)
    }
    return text
  }
  const metadataTextValue = await metadataText('release-metadata.json')
  const metadata = metadataSchema.parse(JSON.parse(metadataTextValue) as unknown)
  if (
    metadata.version !== stableVersion ||
    metadata.tag !== release.tag_name ||
    metadata.commit !== release.target_commitish ||
    metadata.buildUrl !== `https://github.com/${repository}/actions/runs/${metadata.runId}` ||
    JSON.stringify(metadata.assets.map((entry) => entry.name).sort()) !==
      JSON.stringify(installerNames(stableVersion).sort())
  ) {
    throw new Error('Published build metadata disagrees with release identity or installers.')
  }
  for (const entry of metadata.assets) {
    const published = asset(entry.name)
    if (published.size !== entry.size || published.digest !== `sha256:${entry.sha256}`) {
      throw new Error(`Installer metadata mismatch: ${entry.name}.`)
    }
  }
  const sums = await metadataText('SHA256SUMS')
  const expectedSums = [
    ...metadata.assets,
    { name: 'release-metadata.json', sha256: hash(metadataTextValue) }
  ]
    .map((entry) => `${entry.sha256}  ${entry.name}`)
    .sort()
  if (JSON.stringify(sums.trimEnd().split('\n').sort()) !== JSON.stringify(expectedSums)) {
    throw new Error('Published checksums disagree with build metadata.')
  }
  return releaseStateSchema.parse({
    schemaVersion: 1,
    source: 'github',
    generatedAt,
    stable: {
      version: stableVersion,
      tag: release.tag_name,
      publishedAt: release.published_at,
      releaseUrl: release.html_url,
      downloads: names.map((name) => {
        const entry = asset(name)
        return {
          name,
          url: entry.browser_download_url,
          size: entry.size,
          sha256: entry.digest.slice(7)
        }
      })
    }
  })
}

/** Projects the site model to the stable version-1 installed-client contract. */
export function versionFeed(state: ReleaseState) {
  const validated = releaseStateSchema.parse(state)
  if (validated.source !== 'github')
    throw new Error('Offline preview data cannot produce a public version feed.')
  const stable = validated.stable
  return {
    schemaVersion: 1,
    generatedAt: validated.generatedAt,
    stable:
      stable === null
        ? null
        : {
            version: stable.version,
            tag: stable.tag,
            publishedAt: stable.publishedAt,
            releaseUrl: stable.releaseUrl
          }
  }
}
