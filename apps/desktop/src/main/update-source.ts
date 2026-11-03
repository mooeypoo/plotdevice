import type { UpdateSource } from '@plotdevice/application'
import { latestReleaseSchema } from '@plotdevice/contracts'
import { err, ok } from '@plotdevice/shared'

/**
 * Where update notices come from (Milestone 15). GitHub sends this address to the newest published
 * release's `latest.json`, so it never changes, even if the documentation site moves.
 */
export const LATEST_RELEASE_URL = 'https://github.com/mooeypoo/plotdevice/releases/latest/download/latest.json'

/** github.com redirects release files to its file hosts; nothing else is followed. */
export const GITHUB_HOSTS = ['github.com', 'objects.githubusercontent.com', 'release-assets.githubusercontent.com']

const MAX_REDIRECTS = 5
const TIMEOUT_MS = 10_000
/** latest.json is a few hundred bytes; anything this big isn't it. */
const MAX_BYTES = 64 * 1024

export interface UpdateSourceOptions {
  url: string
  /** Hosts the request and every redirect may go to. */
  hosts: string[]
  /** Tests only: a local server without HTTPS. */
  allowHttp?: boolean
  timeoutMs?: number
  maxBytes?: number
}

/**
 * Fetches `latest.json`. The request carries nothing about the author or the app: no identifier, no
 * version and no cookies. Redirects are followed by hand so each one is checked against `hosts`.
 */
export function createUpdateSource({
  url,
  hosts,
  allowHttp = false,
  timeoutMs = TIMEOUT_MS,
  maxBytes = MAX_BYTES,
}: UpdateSourceOptions): UpdateSource {
  const allowed = (address: URL): boolean =>
    (address.protocol === 'https:' || (allowHttp && address.protocol === 'http:')) && hosts.includes(address.hostname)
  return {
    async latest() {
      const signal = AbortSignal.timeout(timeoutMs)
      try {
        let address = new URL(url)
        for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
          if (!allowed(address)) return err('unreachable')
          const response = await fetch(address, {
            redirect: 'manual',
            credentials: 'omit',
            signal,
            headers: { accept: 'application/json' },
          })
          const location = response.headers.get('location')
          if (response.status >= 300 && response.status < 400 && location) {
            address = new URL(location, address)
            continue
          }
          if (!response.ok) return err('unreachable')
          const text = await readUpTo(response, maxBytes)
          const release = text === null ? null : latestReleaseSchema.safeParse(JSON.parse(text))
          return release?.success ? ok(release.data) : err('unreachable')
        }
        return err('unreachable')
      } catch {
        return err('unreachable')
      }
    },
  }
}

/** The body as text, or `null` once it passes `maxBytes`, without reading the rest. */
async function readUpTo(response: Response, maxBytes: number): Promise<string | null> {
  if (Number(response.headers.get('content-length') ?? 0) > maxBytes || !response.body) return response.body ? null : ''
  const chunks: Uint8Array[] = []
  let size = 0
  for await (const chunk of response.body) {
    size += chunk.byteLength
    if (size > maxBytes) return null // leaving the loop cancels the rest of the download
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}
