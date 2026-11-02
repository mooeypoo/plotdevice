import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { createUpdateSource } from './update-source'

const LATEST = {
  format: 1,
  version: '0.4.0',
  date: '2026-11-20',
  notes: 'https://github.com/mooeypoo/plotdevice/releases/tag/v0.4.0',
  download: { en: 'https://mooeypoo.github.io/plotdevice/start/install/' },
}
let server: Server | undefined
const requests: IncomingMessage[] = []

/** A local server answering with `respond`; returns its base address. */
async function serve(respond: (request: IncomingMessage, response: ServerResponse) => void): Promise<string> {
  server = createServer((request, response) => {
    requests.push(request)
    respond(request, response)
  })
  await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', resolve))
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`
}

const source = (url: string, options: { timeoutMs?: number; maxBytes?: number } = {}) =>
  createUpdateSource({ url, hosts: ['127.0.0.1'], allowHttp: true, ...options })

afterEach(async () => {
  requests.length = 0
  const running = server
  server = undefined
  if (!running) return
  running.closeAllConnections()
  await new Promise((resolve) => running.close(resolve))
})

describe('fetching latest.json', () => {
  it('reads the file, following a redirect to an allowed host', async () => {
    const base = await serve((request, response) => {
      if (request.url === '/latest') response.writeHead(302, { location: '/files/latest.json' }).end()
      else response.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(LATEST))
    })
    expect(await source(`${base}/latest`).latest()).toEqual({ ok: true, value: LATEST })
  })

  it('sends nothing about the author or the app', async () => {
    const base = await serve((_request, response) => response.end(JSON.stringify(LATEST)))
    await source(`${base}/latest.json`).latest()
    expect(requests[0]?.url).toBe('/latest.json')
    expect(requests[0]?.headers.cookie).toBeUndefined()
    expect(requests[0]?.headers.authorization).toBeUndefined()
  })

  it('refuses a redirect to a host that isn’t allowed', async () => {
    const base = await serve((request, response) => {
      if (request.url === '/latest') response.writeHead(302, { location: base.replace('127.0.0.1', 'localhost') + '/elsewhere' }).end()
      else response.end(JSON.stringify(LATEST))
    })
    expect(await source(`${base}/latest`).latest()).toEqual({ ok: false, error: 'unreachable' })
    expect(requests.map((request) => request.url)).toEqual(['/latest'])
  })

  it('refuses plain http unless allowed, and any host not listed', async () => {
    const base = await serve((_request, response) => response.end(JSON.stringify(LATEST)))
    expect(await createUpdateSource({ url: `${base}/latest.json`, hosts: ['127.0.0.1'] }).latest()).toMatchObject({ ok: false })
    expect(await createUpdateSource({ url: `${base}/latest.json`, hosts: ['github.com'], allowHttp: true }).latest()).toMatchObject({
      ok: false,
    })
    expect(requests).toHaveLength(0)
  })

  it('gives up after a few redirects', async () => {
    const base = await serve((_request, response) => response.writeHead(302, { location: '/again' }).end())
    expect(await source(`${base}/latest`).latest()).toMatchObject({ ok: false })
    expect(requests.length).toBeLessThan(10)
  })

  it.each([
    ['a missing file', (response: ServerResponse) => response.writeHead(404).end('Not Found')],
    ['a page that isn’t JSON', (response: ServerResponse) => response.end('<html>Sign in</html>')],
    ['a file in a format it can’t read', (response: ServerResponse) => response.end(JSON.stringify({ ...LATEST, format: 2 }))],
    [
      'a release with a link that isn’t https',
      (response: ServerResponse) => response.end(JSON.stringify({ ...LATEST, notes: 'http://x/' })),
    ],
    ['a huge answer', (response: ServerResponse) => response.end(`{"padding":"${'x'.repeat(10_000)}"}`)],
    [
      'a huge answer with no length given',
      (response: ServerResponse) => {
        response.writeHead(200, { 'transfer-encoding': 'chunked' })
        for (let i = 0; i < 20; i++) response.write('x'.repeat(1000))
        response.end()
      },
    ],
  ])('fails quietly on %s', async (_name, respond) => {
    const base = await serve((_request, response) => respond(response))
    expect(await source(`${base}/latest.json`, { maxBytes: 4096 }).latest()).toEqual({ ok: false, error: 'unreachable' })
  })

  it('stops waiting for a server that doesn’t answer', async () => {
    const base = await serve(() => undefined)
    expect(await source(`${base}/latest.json`, { timeoutMs: 200 }).latest()).toEqual({ ok: false, error: 'unreachable' })
  })

  it('fails quietly when nothing is there (offline)', async () => {
    expect(await source('http://127.0.0.1:9/latest.json').latest()).toEqual({ ok: false, error: 'unreachable' })
  })
})
