// Writes apps/desktop/build/third-party-licenses.json: every open-source package the app includes, with
// its licence, for the About window (GPL compliance; Milestone 7, decision 4). Run from apps/desktop.
// The packages' runtime dependencies are bundled into the app; Electron is the runtime itself.
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'

const repository = join(import.meta.dirname, '..')
const report = JSON.parse(
  execFileSync('pnpm', ['licenses', 'list', '--json', '--prod', '--filter', './packages/*'], {
    cwd: repository,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  }),
)
const packages = Object.values(report)
  .flat()
  .flatMap((entry) =>
    entry.versions.map((version) => ({ name: entry.name, version, license: entry.license, homepage: entry.homepage ?? null })),
  )

const electronManifest = createRequire(join(repository, 'apps/desktop/package.json')).resolve('electron/package.json')
const electron = JSON.parse(readFileSync(electronManifest, 'utf8'))
packages.push({ name: 'electron', version: electron.version, license: electron.license, homepage: 'https://www.electronjs.org' })

const list = packages
  .filter((entry) => !entry.name.startsWith('@plotdevice/'))
  .sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version))
mkdirSync(join(repository, 'apps/desktop/build'), { recursive: true })
writeFileSync(join(repository, 'apps/desktop/build/third-party-licenses.json'), `${JSON.stringify(list, null, 2)}\n`)
console.log(`Third-party licences: ${list.length} packages.`)
