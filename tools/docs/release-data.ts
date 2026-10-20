import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { z } from 'zod'
import {
  discoverPublishedRelease,
  releaseStateSchema,
  repository,
  type ReleaseState,
  type PublishedReleaseRemote
} from '../release/published-release.ts'

export const releaseStatePath = fileURLToPath(
  new URL('../../docs/.vitepress/release-state.json', import.meta.url)
)

/** Refuses a queued deployment whose release snapshot or source commit is obsolete. */
export function checkDeploymentFreshness(
  built: ReleaseState,
  current: ReleaseState,
  builtCommit: string,
  checkout: string,
  mainCommit: string
): void {
  if (built.source !== 'github' || current.source !== 'github') {
    throw new Error('Cannot deploy preview data.')
  }
  if (JSON.stringify(built.stable) !== JSON.stringify(current.stable)) {
    throw new Error(
      'Published release state changed while building; rerun Documentation instead of deploying stale data.'
    )
  }
  if (mainCommit !== checkout || checkout !== builtCommit) {
    throw new Error(
      'main or deployment checkout differs from the built artifact; rerun Documentation.'
    )
  }
}

function api(...args: string[]): string {
  return execFileSync('gh', ['api', ...args], {
    encoding: 'utf8',
    maxBuffer: 2 * 1024 * 1024,
    timeout: 60_000,
    stdio: ['ignore', 'pipe', 'pipe']
  })
}

/** Uses authenticated GitHub discovery; API failures propagate without a fallback. */
export function githubPublishedRemote(): PublishedReleaseRemote {
  return {
    list() {
      const pages: unknown = JSON.parse(
        api(`repos/${repository}/releases?per_page=100`, '--paginate', '--slurp')
      )
      return Promise.resolve(z.array(z.array(z.unknown())).parse(pages).flat())
    },
    latest() {
      return Promise.resolve(JSON.parse(api(`repos/${repository}/releases/latest`)) as unknown)
    },
    asset(id) {
      return Promise.resolve(
        api(
          `repos/${repository}/releases/assets/${String(id)}`,
          '-H',
          'Accept: application/octet-stream'
        )
      )
    }
  }
}

/** Rechecks current release state and main revision immediately before a Pages deployment. */
export async function assertFreshReleaseData(): Promise<void> {
  const state = releaseStateSchema.parse(
    JSON.parse(readFileSync(releaseStatePath, 'utf8')) as unknown
  )
  const fresh = await discoverPublishedRelease(githubPublishedRemote(), new Date().toISOString())
  const mainCommit = z
    .object({ sha: z.string() })
    .parse(JSON.parse(api(`repos/${repository}/commits/main`)) as unknown).sha
  const checkout = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  const builtCommit = readFileSync(
    resolve(dirname(releaseStatePath), 'site-commit.txt'),
    'utf8'
  ).trim()
  checkDeploymentFreshness(state, fresh, builtCommit, checkout, mainCommit)
}

async function main(): Promise<void> {
  const [command, ...extra] = process.argv.slice(2)
  if (extra.length > 0 || !['preview', 'github', 'fresh'].includes(command ?? '')) {
    throw new Error('Usage: release-data.ts preview | github | fresh')
  }
  if (command === 'fresh') {
    await assertFreshReleaseData()
    console.log('Current published release state and main commit match this deployment.')
    return
  }
  const generatedAt = new Date().toISOString()
  const state =
    command === 'github'
      ? await discoverPublishedRelease(githubPublishedRemote(), generatedAt)
      : releaseStateSchema.parse({ schemaVersion: 1, source: 'preview', generatedAt, stable: null })
  mkdirSync(dirname(releaseStatePath), { recursive: true })
  writeFileSync(releaseStatePath, `${JSON.stringify(state, null, 2)}\n`)
  if (command === 'github') {
    const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
    writeFileSync(resolve(dirname(releaseStatePath), 'site-commit.txt'), `${commit}\n`)
  }
  console.log(
    command === 'github'
      ? `Verified published release state: ${state.stable?.version ?? 'no stable release'}.`
      : 'Offline documentation preview: no published-release claim or public version feed.'
  )
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  void main().catch((error: unknown) => {
    console.error('Release data failed:', error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
