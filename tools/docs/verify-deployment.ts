import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { releaseStatePath } from './release-data.ts'
import { releaseStateSchema, versionFeed, type ReleaseState } from '../release/published-release.ts'

const site = 'https://mooeypoo.github.io/plotdevice/'

/** Verifies anonymous deployed JSON identity and referenced release/download reachability. */
export async function verifyDeployment(
  state: ReleaseState,
  request: typeof fetch = fetch
): Promise<void> {
  const expected = versionFeed(state)
  const response = await request(`${site}updates/v1/latest.json`, {
    headers: { 'Cache-Control': 'no-cache' },
    signal: AbortSignal.timeout(15_000),
    redirect: 'error'
  })
  if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('Deployed version feed is unavailable or not JSON.')
  }
  const text = await response.text()
  if (Buffer.byteLength(text) > 64 * 1024) throw new Error('Deployed version feed is oversized.')
  const actual: unknown = JSON.parse(text)
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error('Deployed version feed has not converged to this build.')
  }
  const urls = [site, `${site}download.html`, `${site}updates.html`]
  if (state.stable !== null) {
    urls.push(state.stable.releaseUrl, ...state.stable.downloads.map((asset) => asset.url))
  }
  for (const url of urls) {
    const result = await request(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000)
    })
    if (!result.ok) throw new Error(`Anonymous published URL is unavailable: ${url}.`)
    const final = new URL(result.url || url)
    if (final.protocol !== 'https:') throw new Error('Anonymous download redirected outside HTTPS.')
    if (
      final.hostname !== 'mooeypoo.github.io' &&
      final.hostname !== 'github.com' &&
      final.hostname !== 'release-assets.githubusercontent.com'
    ) {
      throw new Error(`Anonymous URL redirected to an unexpected host: ${final.hostname}.`)
    }
  }
}

async function main(): Promise<void> {
  const state = releaseStateSchema.parse(
    JSON.parse(readFileSync(releaseStatePath, 'utf8')) as unknown
  )
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      await verifyDeployment(state)
      console.log('Anonymous Pages feed, download page, and referenced release assets verified.')
      return
    } catch (error: unknown) {
      console.error(
        `Deployment verification attempt ${String(attempt)} failed:`,
        error instanceof Error ? error.message : error
      )
      if (attempt === 6) throw error
      await new Promise((done) => setTimeout(done, 20_000))
    }
  }
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  void main().catch((error: unknown) => {
    console.error('Deployment verification failed:', error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
