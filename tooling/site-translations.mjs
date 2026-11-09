// `pnpm site:translations`: for every language of the website, which guide pages aren't translated yet,
// and which were translated from an English page that has changed since (Milestone 10, decision 7); and
// which of the site's own messages (src/i18n, Milestone 24) aren't translated yet.
// A translated page records the English page it came from as `sourceHash` in its frontmatter.
// `pnpm site:translations --stamp he` sets `sourceHash` on every Hebrew page to its English page's
// current hash: run it after bringing translations up to date.
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const site = join(import.meta.dirname, '../apps/site')
const docs = join(site, 'src/content/docs')
const config = readFileSync(join(site, 'astro.config.ts'), 'utf8')
// English is at the root (Starlight's `root` locale, which this doesn't match); every other language
// has a folder of its own.
const locales = [...config.matchAll(/^\s+([a-z]{2,3}(?:-[A-Za-z]+)?): \{ label:/gm)].map((match) => match[1])
const messages = (locale) => {
  try {
    return Object.keys(JSON.parse(readFileSync(join(site, 'src/i18n', `${locale}.json`), 'utf8'))).filter((key) => !key.startsWith('@'))
  } catch {
    return []
  }
}
const englishMessages = messages('en')

const files = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return dir === docs && locales.includes(entry.name) ? [] : files(path)
    return /\.mdx?$/.test(entry.name) ? [path] : []
  })
const hash = (path) => createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 12)
// Quoted when written: a hash like `665561e05599` would otherwise be read as a number (665561 × 10^5599).
const sourceHashOf = (text) => /^sourceHash:\s*'?([0-9a-f]+)'?\s*$/m.exec(text.split(/^---$/m)[1] ?? '')?.[1]

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
        ? text.replace(/^sourceHash:.*$/m, `sourceHash: '${current}'`)
        : text.replace(/^---\n/, `---\nsourceHash: '${current}'\n`)
      writeFileSync(translated, withHash)
    } else if (sourceHashOf(text) !== current) outdated.push(page)
  }
  const translatedMessages = messages(locale)
  const untranslated = englishMessages.filter((key) => !translatedMessages.includes(key))
  behind += missing.length + outdated.length + untranslated.length
  console.log(
    `\n${locale}: ${english.length - missing.length} of ${english.length} pages translated${stamp === locale ? ' (stamped as up to date)' : ''}`,
  )
  for (const page of missing) console.log(`  not yet translated: ${page}`)
  for (const page of outdated) console.log(`  English changed since: ${page}`)
  console.log(`${locale}: ${englishMessages.length - untranslated.length} of ${englishMessages.length} site messages translated`)
  for (const key of untranslated) console.log(`  message not yet translated: ${key}`)
}
if (behind === 0) console.log('\nEvery translation is complete and up to date.')
