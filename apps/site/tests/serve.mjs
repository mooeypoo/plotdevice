// Serves the built site as Netlify does (Milestone 24): from the root, the redirects in `_redirects`
// (exact addresses, with or without the trailing slash), `index.html` for folders, and a not-found page
// for anything missing. A form is "sent" by answering with the page it posts to, as
// Netlify does once it has kept the form. For the site tests only; the language rule at `/` (in
// public/_redirects) is Netlify's own and is checked as a file.
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'

const root = join(import.meta.dirname, '../dist')
const port = Number(process.argv[2] ?? 4330)
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
  '.md': 'text/markdown; charset=utf-8',
}

const trim = (address) => (address.length > 1 ? address.replace(/\/$/, '') : address)
const redirects = new Map(
  (await readFile(join(root, '_redirects'), 'utf8'))
    .split('\n')
    .map((line) => line.trim().split(/\s+/))
    .filter(([from, , status]) => from?.startsWith('/') && /^30\d$/.test(status ?? ''))
    .map(([from, to, status]) => [trim(from), { to, status: Number(status) }]),
)

createServer(async (request, response) => {
  request.resume()
  const path = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname)
  const redirect = redirects.get(trim(path))
  if (redirect) {
    response.writeHead(redirect.status, { location: redirect.to })
    response.end()
    return
  }
  let file = normalize(join(root, path))
  if (!file.startsWith(root)) file = ''
  if (file && (await stat(file).catch(() => null))?.isDirectory()) file = join(file, 'index.html')
  const body = file ? await readFile(file).catch(() => null) : null
  const notFound = path.startsWith('/he/') ? 'he/404/index.html' : '404.html'
  response.writeHead(body ? 200 : 404, { 'content-type': types[body ? extname(file) : '.html'] ?? 'application/octet-stream' })
  response.end(body ?? (await readFile(join(root, notFound))))
}).listen(port, '127.0.0.1')
