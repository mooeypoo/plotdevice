// `pnpm site:translations`: for every language of the documentation site, which pages aren't translated
// yet, and which were translated from an English page that has changed since (Milestone 10, decision 7).
// A translated page records the English page it came from as `sourceHash` in its frontmatter.
// `pnpm site:translations --stamp he` sets `sourceHash` on every Hebrew page to its English page's
// current hash: run it after bringing translations up to date.
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const site = join(import.meta.dirname, '../apps/site')
const docs = join(site, 'src/content/docs')
const config = readFileSync(join(site, 'astro.config.ts'), 'utf8')
const locales = [...config.matchAll(/^\s+([a-z]{2,3}(?:-[A-Za-z]+)?): \{ label:/gm)].map((match) => match[1])

const files = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return dir === docs && locales.includes(entry.name) ? [] : files(path)
    return /\.mdx?$/.test(entry.name) ? [path] : []
  })
const hash = (path) => createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 12)
const sourceHashOf = (text) => /^sourceHash:\s*(\S+)/m.exec(text.split(/^---$/m)[1] ?? '')?.[1]

const english = files(docs).map((path) => relative(docs, path))
const stamp = process.argv.includes('--stamp') ? process.argv[process.argv.indexOf('--stamp') + 1] : null
let behind = 0

for (const locale of locales) {
  const missing = []
  const outdated = []
  for (const page of english) {
    const translated = join(docs, locale, page)
    let text
    try {
      text = readFileSync(translated, 'utf8')
    } catch {
      missing.push(page)
      continue
    }
    const current = hash(join(docs, page))
    if (stamp === locale) {
      const withHash = sourceHashOf(text)
        ? text.replace(/^sourceHash:.*$/m, `sourceHash: ${current}`)
        : text.replace(/^---\n/, `---\nsourceHash: ${current}\n`)
      writeFileSync(translated, withHash)
    } else if (sourceHashOf(text) !== current) outdated.push(page)
  }
  behind += missing.length + outdated.length
  console.log(
    `\n${locale}: ${english.length - missing.length} of ${english.length} pages translated${stamp === locale ? ' (stamped as up to date)' : ''}`,
  )
  for (const page of missing) console.log(`  not yet translated: ${page}`)
  for (const page of outdated) console.log(`  English changed since: ${page}`)
}
if (behind === 0) console.log('\nEvery translation is complete and up to date.')
