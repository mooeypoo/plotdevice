import { createFileStore } from '@plotdevice/fs-node'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { checkProject } from '../src/index'

/**
 * The guide for AI assistants (Milestone 13) shows a small book, file by file. Each example is a
 * `path`: line followed by a Markdown block. Built into a folder, it must be a book the app reads
 * with nothing to fix, so the guide can't drift from the format.
 */
const GUIDE = join(import.meta.dirname, '../../../apps/site/public/for-assistants.md')
const EXAMPLE = /^`([^`\n]+\.md)`:\n\n```markdown\n([\s\S]*?)\n```$/gm

const dirs: string[] = []
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

describe('the guide for AI assistants', () => {
  it('shows a book with nothing to fix and nothing unexpected', async () => {
    const guide = await readFile(GUIDE, 'utf8')
    const examples = [...guide.matchAll(EXAMPLE)].map((match) => ({ path: match[1] ?? '', text: `${match[2] ?? ''}\n` }))
    // project.md is shown without a file label, as the first example of all.
    const project = /## project\.md\n\n```markdown\n([\s\S]*?)\n```/.exec(guide)?.[1]
    expect(project).toBeDefined()
    expect(examples.map((e) => e.path)).toContain('CONTENTS.md')

    const root = await mkdtemp(join(tmpdir(), 'plotdevice-guide-'))
    dirs.push(root)
    for (const { path, text } of [{ path: 'project.md', text: `${project}\n` }, ...examples]) {
      await mkdir(dirname(join(root, path)), { recursive: true })
      await writeFile(join(root, path), text)
    }

    const result = await checkProject(createFileStore(root))
    expect(result.findings).toEqual([])
    expect(result.counts).toEqual({ chapters: 3, characters: 2, places: 2, notes: 2, outlines: 1 })
  })
})
