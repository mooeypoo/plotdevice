import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { releaseStateSchema, versionFeed, type ReleaseState } from '../release/published-release.ts'

export const siteBase = '/plotdevice/'
export const publicPages = [
  'index.html',
  '404.html',
  'architecture.html',
  'contributing.html',
  'development.html',
  'download.html',
  'file-format.html',
  'font-licenses.html',
  'releases.html',
  'updates.html',
  'guide/start.html',
  'guide/writing.html',
  'guide/codex.html',
  'guide/story.html',
  'guide/safety.html',
  'guide/troubleshooting.html'
]

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? filesUnder(path) : [path]
  })
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
}

/** Checks the built publication boundary and local HTML links without network requests. */
export function verifySite(directory: string): string[] {
  const root = resolve(directory)
  const files = filesUnder(root)
  const htmlFiles = files.filter((file) => extname(file) === '.html')
  const pages = htmlFiles.map((file) => relative(root, file).split(sep).join('/')).sort()
  const errors: string[] = []
  if (JSON.stringify(pages) !== JSON.stringify([...publicPages].sort())) {
    errors.push(
      `Published HTML inventory differs from the approved public pages: ${pages.join(', ')}.`
    )
  }

  const html = new Map(htmlFiles.map((file) => [file, readFileSync(file, 'utf8')]))
  const base = new URL(`https://docs.example.invalid${siteBase}`)
  for (const [file, text] of html) {
    const source = relative(root, file).split(sep).join('/')
    const pageUrl = new URL(source, base)
    for (const match of text.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
      const raw = match[1]
      if (raw === undefined || raw.startsWith('data:')) continue
      const url = new URL(decodeEntities(raw), pageUrl)
      if (url.origin !== base.origin) continue
      if (!url.pathname.startsWith(siteBase)) {
        errors.push(`${source}: URL escapes the Pages base: ${raw}.`)
        continue
      }
      const path = decodeURIComponent(url.pathname.slice(siteBase.length))
      let target = resolve(root, path)
      if (url.pathname.endsWith('/')) target = join(target, 'index.html')
      else if (extname(target) === '') target += '.html'
      const inside = relative(root, target)
      if (inside.startsWith(`..${sep}`) || inside === '..') {
        errors.push(`${source}: URL escapes the output directory: ${raw}.`)
        continue
      }
      if (!existsSync(target)) {
        errors.push(`${source}: Missing local target: ${raw}.`)
        continue
      }
      if (url.hash !== '' && extname(target) === '.html') {
        const targetHtml = html.get(target) ?? ''
        const id = decodeURIComponent(url.hash.slice(1))
        if (!targetHtml.includes(`id="${id}"`)) {
          errors.push(`${source}: Missing fragment: ${raw}.`)
        }
      }
    }
  }
  return errors
}

/** Verifies that human download links and raw feed match the same discovered state. */
export function verifyReleaseOutput(directory: string, state: ReleaseState): void {
  const validated = releaseStateSchema.parse(state)
  const feedPath = join(directory, 'updates/v1/latest.json')
  if (validated.source === 'preview') {
    if (existsSync(feedPath))
      throw new Error('Offline preview must not contain a public version feed.')
    return
  }
  const actual: unknown = JSON.parse(readFileSync(feedPath, 'utf8'))
  if (JSON.stringify(actual) !== JSON.stringify(versionFeed(validated))) {
    throw new Error('Generated feed does not match discovered published state.')
  }
  if (validated.stable !== null) {
    const html = readFileSync(join(directory, 'download.html'), 'utf8')
    for (const asset of validated.stable.downloads) {
      if (!html.includes(`href="${asset.url}"`)) {
        throw new Error(`Download page is missing the verified published asset ${asset.name}.`)
      }
    }
  }
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const directory = resolve(dirname(fileURLToPath(import.meta.url)), '../../docs/.vitepress/dist')
    const errors = verifySite(directory)
    if (errors.length > 0) throw new Error(errors.join('\n'))
    const state = releaseStateSchema.parse(
      JSON.parse(readFileSync(resolve(directory, '../release-state.json'), 'utf8')) as unknown
    )
    verifyReleaseOutput(directory, state)
    console.log(
      `Verified ${String(publicPages.length)} public pages, local links, fragments, and static asset references under ${siteBase}.`
    )
  } catch (error: unknown) {
    console.error(
      'Documentation verification failed:',
      error instanceof Error ? error.message : error
    )
    process.exitCode = 1
  }
}
