// Serves the built site as GitHub Pages does: under /plotdevice/, `index.html` for folders, and the
// site's 404 page for anything missing. For the site tests only.
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
}

createServer(async (request, response) => {
  const path = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname)
  let file = path.startsWith('/plotdevice/') ? normalize(join(root, path.slice('/plotdevice/'.length))) : ''
  if (file && !file.startsWith(root)) file = ''
  if (file && (await stat(file).catch(() => null))?.isDirectory()) file = join(file, 'index.html')
  const body = file ? await readFile(file).catch(() => null) : null
  response.writeHead(body ? 200 : 404, { 'content-type': types[extname(body ? file : '.html')] ?? 'application/octet-stream' })
  response.end(body ?? (await readFile(join(root, '404.html'))))
}).listen(port, '127.0.0.1')
