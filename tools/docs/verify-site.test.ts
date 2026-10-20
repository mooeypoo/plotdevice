import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { publicPages, verifySite } from './verify-site'

const directories: string[] = []
afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true })
})

it('keeps Pages publication manual, public-only, main-only and least-privileged', () => {
  const text = readFileSync('.github/workflows/pages.yml', 'utf8')
  const workflow: unknown = parse(text)
  expect(workflow).toMatchObject({
    on: { workflow_dispatch: { inputs: { deploy: { type: 'boolean', default: false } } } },
    permissions: { contents: 'read' },
    concurrency: { group: 'plotdevice-pages', 'cancel-in-progress': false },
    jobs: {
      deploy: {
        needs: 'build',
        if: "inputs.deploy && !github.event.repository.private && github.ref == 'refs/heads/main'",
        permissions: { pages: 'write', 'id-token': 'write' },
        environment: { name: 'github-pages' }
      }
    }
  })
  expect(text).not.toMatch(/^\s+(push|pull_request|release):/m)
  expect(text).not.toMatch(/uses: actions\/[\w-]+@v/)
  expect(readFileSync('.github/workflows/ci.yml', 'utf8')).toContain('npm run docs:build')
})

function fixture(): string {
  const directory = mkdtempSync(join(tmpdir(), 'plotdevice-docs-'))
  directories.push(directory)
  for (const page of publicPages) {
    const path = join(directory, page)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, '<html><h1 id="hello">Hello</h1></html>')
  }
  return directory
}

describe('documentation publication checks', () => {
  it('accepts exact public pages and valid base-relative, encoded, fragment, and external links', () => {
    const directory = fixture()
    writeFileSync(
      join(directory, 'index.html'),
      `<a href="/plotdevice/guide/start.html#hello">Start</a>
      <a href="https://github.com/mooeypoo/plotdevice">Source</a>
      <img src="/plotdevice/test%20image.svg">
      <img src="data:image/svg+xml,test">
      <a href="/plotdevice/updates.html?one=1&amp;two=2#hello">Updates</a>`
    )
    writeFileSync(join(directory, 'test image.svg'), '<svg/>')
    expect(verifySite(directory)).toEqual([])
  })

  it('rejects internal planning pages even if no sidebar points to them', () => {
    const directory = fixture()
    writeFileSync(join(directory, 'release-plan.html'), 'Internal')
    expect(verifySite(directory).join('\n')).toContain('inventory differs')
  })

  it('rejects missing pages, fragments, assets, and URLs outside the project base', () => {
    const directory = fixture()
    writeFileSync(
      join(directory, 'guide/start.html'),
      `<a href="../download.html#missing">Broken fragment</a>
      <a href="/download.html">Wrong base</a><img src="../missing.png">
      <a href="../missing.html">Missing page</a>`
    )
    const errors = verifySite(directory).join('\n')
    expect(errors).toContain('Missing fragment')
    expect(errors).toContain('escapes the Pages base')
    expect(errors).toContain('Missing local target: ../missing.png')
    expect(errors).toContain('Missing local target: ../missing.html')
  })

  it('rejects removal of an expected page', () => {
    const directory = fixture()
    rmSync(join(directory, 'file-format.html'))
    expect(verifySite(directory).join('\n')).toContain('inventory differs')
  })
})
