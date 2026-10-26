// `pnpm demo` opens a fresh copy of the English demo novel in the development app; `pnpm demo he`
// opens the Hebrew one. The copy goes to a temporary folder, replaced each time, so trying the app
// never changes the repository's files. `--no-sandbox` is passed on, for systems that need it.
import { spawn } from 'node:child_process'
import { cp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const DEMOS = { en: 'the-salt-orchard', he: 'מטע-המלח' }
const args = process.argv.slice(2)
const language = args.find((arg) => arg in DEMOS) ?? 'en'
const noSandbox = args.includes('--no-sandbox')

const folder = join(tmpdir(), 'plotdevice-demo', DEMOS[language])
await rm(folder, { recursive: true, force: true })
await cp(join(import.meta.dirname, '../samples', DEMOS[language]), folder, { recursive: true })
console.log(`A fresh copy of the demo is at ${folder}`)

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE
const dev = spawn(
  'pnpm',
  ['--filter', '@plotdevice/desktop', 'exec', 'electron-vite', 'dev', ...(noSandbox ? ['--noSandbox'] : []), '--', folder],
  {
    stdio: 'inherit',
    env,
    shell: process.platform === 'win32',
  },
)
dev.on('exit', (code) => process.exit(code ?? 0))
