import { createJournalStore, createProjectFolders, randomIdGenerator } from '@plotdevice/fs-node'
import type { ProjectPath } from '@plotdevice/shared'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createOutlineRepository, createProjectRepository } from '../src/index'
import { generateLargeProject } from './large-project.test-support'

// Limits agreed for Milestone 6 (decision 6). CI machines are slower and shared, so CI allows twice these.
const SLACK = process.env.CI ? 2 : 1
const LIMITS = { open: 1500, switchChapter: 200, moveChapter: 300, moveCard: 500 }

let base = ''
let root = ''
beforeAll(async () => {
  base = await mkdtemp(join(tmpdir(), 'plotdevice-large-'))
  root = join(base, 'A Long Book')
  await generateLargeProject(root)
}, 60_000)
afterAll(async () => {
  await rm(base, { recursive: true, force: true })
})

/** The median of five runs, in milliseconds: one slow run (a disk hiccup) doesn't decide. */
async function median(action: () => Promise<unknown>): Promise<number> {
  const times: number[] = []
  for (let run = 0; run < 5; run++) {
    const start = performance.now()
    await action()
    times.push(performance.now() - start)
  }
  return times.sort((a, b) => a - b)[2] ?? Number.POSITIVE_INFINITY
}

function unwrap<T>(result: { ok: true; value: T } | { ok: false; error: unknown }): T {
  if (!result.ok) throw new Error(`expected success, got ${JSON.stringify(result.error)}`)
  return result.value
}

describe('a large book (150 chapters, 2,000 outline cards) stays fast', () => {
  const folders = createProjectFolders()
  const repository = () =>
    createProjectRepository({ folders, journals: createJournalStore(join(base, 'app-data')), ids: randomIdGenerator })

  it(`opens in under ${LIMITS.open * SLACK} ms`, async () => {
    const time = await median(async () => unwrap(await repository().open(root)))
    console.log(`open: ${time.toFixed(0)} ms`)
    expect(time).toBeLessThan(LIMITS.open * SLACK)
  }, 60_000)

  it(`switches chapters in under ${LIMITS.switchChapter * SLACK} ms`, async () => {
    let n = 0
    const time = await median(async () =>
      unwrap(await repository().readChapter(root, `manuscript/chapter-${String(++n * 20).padStart(3, '0')}.md` as ProjectPath)),
    )
    console.log(`switch chapter: ${time.toFixed(0)} ms`)
    expect(time).toBeLessThan(LIMITS.switchChapter * SLACK)
  })

  it(`moves a chapter in under ${LIMITS.moveChapter * SLACK} ms`, async () => {
    const projects = repository()
    let snapshot = unwrap(await projects.open(root))
    let toEnd = true
    const time = await median(async () => {
      const placement = toEnd ? { part: 14, index: 9 } : { part: 0, index: 0 }
      toEnd = !toEnd
      snapshot = unwrap(
        await projects.changeContents(snapshot, { kind: 'move-chapter', file: 'manuscript/chapter-001.md' as ProjectPath, placement }),
      )
    })
    console.log(`move chapter: ${time.toFixed(0)} ms`)
    expect(time).toBeLessThan(LIMITS.moveChapter * SLACK)
  }, 60_000)

  it(`moves a card on a 2,000-card outline in under ${LIMITS.moveCard * SLACK} ms`, async () => {
    const outlines = createOutlineRepository({ folders })
    const file = 'outlines/everything.md' as ProjectPath
    let current = unwrap(await outlines.readOutline(root, file))
    const time = await median(async () => {
      const edited = unwrap(
        await outlines.editOutline(
          root,
          file,
          { kind: 'move-item', from: { section: 0, path: [0] }, to: { section: 19, parentPath: [], index: 50 } },
          current.revision,
          current.nestingUnit,
        ),
      )
      current = edited.document
    })
    console.log(`move card: ${time.toFixed(0)} ms`)
    expect(time).toBeLessThan(LIMITS.moveCard * SLACK)
  }, 60_000)
})
