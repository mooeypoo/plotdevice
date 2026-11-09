import { expect, test } from '@playwright/test'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

// The built site's files and the site's words (Milestone 24), checked without a browser.
const site = join(import.meta.dirname, '..')
const dist = join(site, 'dist')
const catalog = (name: string): Record<string, string> => JSON.parse(readFileSync(join(site, 'src/i18n', `${name}.json`), 'utf8'))
const messages = (name: string) => Object.entries(catalog(name)).filter(([key]) => !key.startsWith('@'))

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)],
  )

test('no page still points at the old address under /plotdevice/', () => {
  const old = files(dist)
    .filter((file) => /\.(html|md|txt)$/.test(file))
    .filter((file) => /(href|src)="\/plotdevice\/|mooeypoo\.github\.io/.test(readFileSync(file, 'utf8')))
    .map((file) => relative(dist, file))
  expect(old).toEqual([])
})

test('every message has a Hebrew translation and a translator’s note', () => {
  const english = messages('en').map(([key]) => key)
  expect(english.filter((key) => typeof catalog('he')[key] !== 'string')).toEqual([])
  expect(english.filter((key) => typeof catalog('qqq')[key] !== 'string')).toEqual([])
  expect(
    messages('he')
      .map(([key]) => key)
      .filter((key) => !english.includes(key)),
  ).toEqual([])
})

test('Plot Device is never promised as free, except on the support page’s one line (owner, 2026-11-09)', () => {
  const free = /\bfree\b|חינם|חינמ/i
  const found = ['en', 'he'].flatMap((lang) =>
    messages(lang)
      .filter(([key, text]) => key !== 'support-cost' && free.test(text))
      .map(([key]) => `${lang}: ${key}`),
  )
  expect(found).toEqual([])
})

test('a missing Hebrew page answers with the Hebrew not-found page (Netlify)', () => {
  const rules = readFileSync(join(dist, '_redirects'), 'utf8')
    .split('\n')
    .filter((line) => line.trim() && !line.startsWith('#'))
    .map((line) => line.trim().split(/\s+/))
  expect(rules.at(-1)).toEqual(['/he/*', '/he/404/', '404'])
  expect(existsSync(join(dist, 'he/404/index.html'))).toBe(true)
  expect(existsSync(join(dist, '404.html'))).toBe(true)
})

// The docs workflow copies the newest release's latest.json into the site before these tests run.
test('the update file is in the site, in the shape the app reads', () => {
  const file = join(dist, 'updates/latest.json')
  test.skip(!process.env.CI && !existsSync(file), 'Copied by the docs workflow; not built locally.')
  const latest = JSON.parse(readFileSync(file, 'utf8'))
  expect(latest.format).toBe(1)
  expect(latest.version).toMatch(/^\d+\.\d+\.\d+$/)
  expect(latest.download.en).toMatch(/^https:\/\//)
})

test('Netlify builds the site itself, with the update file, from the repository alone', () => {
  const config = readFileSync(join(site, '../../netlify.toml'), 'utf8')
  expect(config).toMatch(/^\s*publish = "apps\/site\/dist"$/m)
  expect(config).toMatch(/^\s*command = "pnpm site:build && pnpm site:updates"$/m)
  expect(readFileSync(join(dist, '_headers'), 'utf8')).toContain('/_astro/*')
  // Building never runs the app: the screenshots are in the repository.
  expect(readFileSync(join(site, '.gitignore'), 'utf8')).not.toContain('screens')
})

test('the guide’s own address is a redirect on the server, never a page in between, and the site links past it', () => {
  const rules = readFileSync(join(dist, '_redirects'), 'utf8')
  expect(rules).toMatch(/^\/docs\s+\/docs\/start\/install\/\s+301$/m)
  expect(rules).toMatch(/^\/he\/docs\s+\/he\/docs\/start\/install\/\s+301$/m)
  expect(existsSync(join(dist, 'docs/index.html'))).toBe(false)
  const through = files(dist)
    .filter((file) => file.endsWith('.html') && /href="(\/he)?\/docs\/"/.test(readFileSync(file, 'utf8')))
    .map((file) => relative(dist, file))
  expect(through).toEqual([])
})
