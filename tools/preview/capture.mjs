// Captures every preview scenario in English and Hebrew, dark and light, with the installed Chrome, for design
// reviews (U1 audit, U2 screenshot review): `npm run preview:capture [output folder]`.
// One headless Chrome is driven over the DevTools protocol (Node's built-in WebSocket), and each
// screen is captured once the page says its scenario is ready.
import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { extname, join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../../out/preview')
const out = resolve(process.cwd(), process.argv[2] ?? 'docs/plans/u2/screens')
const chrome = process.env.CHROME ?? 'google-chrome'
const width = 1440
const height = 900
const scenarios = readFileSync(
  resolve(import.meta.dirname, '../../src/renderer/src/preview/scenarios.ts'),
  'utf8'
)
  .match(/SCENARIOS = \[([\s\S]*?)\]/u)?.[1]
  .match(/'([a-z-]+)'/gu)
  ?.map((name) => name.slice(1, -1))
if (scenarios === undefined) throw new Error('No scenarios found')

const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
}

const sleep = (ms) => new Promise((done) => setTimeout(done, ms))

function serve() {
  const server = createServer((request, response) => {
    const path = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname)
    const file = join(root, path === '/' ? 'preview.html' : path)
    try {
      if (!file.startsWith(root) || !statSync(file).isFile()) throw new Error('missing')
      response.writeHead(200, {
        'content-type': TYPES[extname(file)] ?? 'application/octet-stream'
      })
      response.end(readFileSync(file))
    } catch {
      response.writeHead(404)
      response.end()
    }
  })
  return new Promise((ready) =>
    server.listen(0, '127.0.0.1', () => ready({ server, port: server.address().port }))
  )
}

/** Starts headless Chrome and resolves to the WebSocket address of its first page. */
async function launch() {
  const profile = mkdtempSync(join(tmpdir(), 'plotdevice-preview-'))
  const browser = spawn(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    `--window-size=${width},${height}`,
    'about:blank'
  ])
  const endpoint = await new Promise((found, fail) => {
    let text = ''
    browser.stderr.on('data', (chunk) => {
      text += chunk
      const match = /DevTools listening on (ws:\/\/[^\s]+)/u.exec(text)
      if (match) found(match[1])
    })
    browser.on('exit', () => fail(new Error(`Chrome exited: ${text}`)))
  })
  const port = new URL(endpoint).port
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  const page = pages.find((target) => target.type === 'page')
  return { browser, profile, pageSocket: page.webSocketDebuggerUrl }
}

/** A minimal DevTools protocol client: send a command, await its result. */
async function connect(address) {
  const socket = new WebSocket(address)
  await new Promise((open) => socket.addEventListener('open', open, { once: true }))
  let next = 0
  const waiting = new Map()
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    const pending = waiting.get(message.id)
    if (pending === undefined) return
    waiting.delete(message.id)
    if (message.error) pending.fail(new Error(message.error.message))
    else pending.done(message.result)
  })
  const send = (method, params = {}) =>
    new Promise((done, fail) => {
      const id = ++next
      waiting.set(id, { done, fail })
      socket.send(JSON.stringify({ id, method, params }))
    })
  return { send, close: () => socket.close() }
}

async function capture(page, url, file) {
  await page.send('Page.navigate', { url })
  for (let waited = 0; waited < 20_000; waited += 100) {
    const { result } = await page.send('Runtime.evaluate', {
      expression: 'document.body?.dataset.previewReady ?? ""',
      returnByValue: true
    })
    if (result.value !== '') break
    await sleep(100)
  }
  await sleep(300)
  const { data } = await page.send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(file, Buffer.from(data, 'base64'))
}

const { server, port } = await serve()
const { browser, profile, pageSocket } = await launch()
const page = await connect(pageSocket)
await page.send('Page.enable')
await page.send('Emulation.setDeviceMetricsOverride', {
  width,
  height,
  deviceScaleFactor: 1,
  mobile: false
})
mkdirSync(out, { recursive: true })
try {
  // The app follows prefers-color-scheme (Electron's nativeTheme drives it), so each theme is
  // captured by emulating that media feature.
  for (const theme of ['dark', 'light']) {
    await page.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-color-scheme', value: theme }]
    })
    for (const lang of ['en', 'he']) {
      for (const scenario of scenarios) {
        const url = `http://127.0.0.1:${port}/preview.html?scenario=${scenario}&lang=${lang}`
        await capture(page, url, join(out, `${scenario}.${lang}.${theme}.png`))
        console.log(`captured ${scenario}.${lang}.${theme}`)
      }
    }
  }
} finally {
  page.close()
  server.close()
  // Chrome writes to its profile while it shuts down; remove it only once Chrome has exited.
  const exited = new Promise((done) => browser.once('exit', done))
  browser.kill()
  await exited
  // Its helper processes can still be closing files; give them a moment rather than fail.
  rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 })
}
