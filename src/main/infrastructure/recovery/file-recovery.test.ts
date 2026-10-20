import { readFile, readdir, rename, unlink, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { parseProjectPath } from '../../shared-kernel/project-path'
import { createEntryFiles } from '../markdown/entry-files'
import { copySampleNovel, type SampleNovelCopy } from '../testing/sample-novel'
import { createFileRecovery } from './file-recovery'

let fixture: SampleNovelCopy
const pathOf = (path: string) => {
  const parsed = parseProjectPath(path)
  if (!parsed.ok) throw new Error(parsed.error.message)
  return parsed.value
}

beforeEach(async () => {
  fixture = await copySampleNovel()
})
afterEach(async () => {
  await fixture.remove()
})

async function captured(
  sourcePath = 'notes/Recovery.md',
  source = '\uFEFF---\r\ntype: chapter\r\ntitle: Old title # keep this\r\nstatus: draft\r\npov: "[[Ilka Szabó]]"\r\ncustom: { x: 1 } # unknown\r\norder: 3\r\n---\r\nOriginal.\r\n'
) {
  const recovery = createFileRecovery(fixture.root, {
    readOnly: false,
    templateFolder: pathOf('templates')
  })
  const files = createEntryFiles(fixture.root, recovery.remember)
  const path = pathOf(sourcePath)
  const osPath = join(fixture.root, ...path.split('/'))
  await writeFile(osPath, source)
  const read = await files.readText(path)
  if (!read.ok) throw new Error(read.error.message)
  const snapshot = recovery.capture(path, read.value.version)
  if (!snapshot.ok) throw new Error(snapshot.error.message)
  return {
    recovery,
    files,
    path,
    source,
    osPath,
    token: snapshot.value,
    version: read.value.version
  }
}

describe('file recovery', () => {
  it('creates a sibling with captured metadata, comments, BOM, CRLF and draft body; leaves outside text intact', async () => {
    const test = await captured()
    await writeFile(test.osPath, 'Intentionally edited outside.\n')
    const result = await test.recovery.saveCopy(test.token, 'My draft.\nMore.\n')
    if (!result.ok) throw new Error(result.error.message)
    expect(result.value.path).toBe('notes/Recovery (recovered).md')
    expect(await readFile(test.osPath, 'utf8')).toBe('Intentionally edited outside.\n')
    expect(await readFile(join(fixture.root, result.value.path), 'utf8')).toBe(
      test.source.replace('Original.\r\n', 'My draft.\r\nMore.\r\n')
    )
  })

  it('does not undo an intentional deletion or move', async () => {
    const test = await captured()
    const moved = join(fixture.root, 'notes', 'Moved.md')
    await rename(test.osPath, moved)
    const result = await test.recovery.saveCopy(test.token, 'Recovered.\n')
    expect(result.ok).toBe(true)
    expect(await readFile(moved, 'utf8')).toBe(test.source)
    expect(await readdir(join(fixture.root, 'notes'))).not.toContain('Recovery.md')
  })

  it('uses a separate name when a case-insensitive collision exists anywhere in the project', async () => {
    const test = await captured()
    await writeFile(join(fixture.root, 'RECOVERY (RECOVERED).md'), 'Do not replace.')
    const result = await test.recovery.saveCopy(test.token, 'Draft')
    if (!result.ok) throw new Error(result.error.message)
    expect(result.value.path.toLowerCase()).not.toBe('notes/recovery (recovered).md')
    expect(await readFile(join(fixture.root, 'RECOVERY (RECOVERED).md'), 'utf8')).toBe(
      'Do not replace.'
    )
  })

  it('never accepts a token in a different project session or an invented version', async () => {
    const test = await captured()
    const other = createFileRecovery(fixture.root, { readOnly: false, templateFolder: undefined })
    expect(await other.saveCopy(test.token, 'No')).toMatchObject({
      ok: false,
      error: { code: 'snapshot-unavailable' }
    })
    expect(test.recovery.capture(test.path, 'invented')).toMatchObject({ ok: false })
  })

  it('pins baseline bytes even after watcher reads see newer metadata and many other files', async () => {
    const test = await captured()
    await writeFile(test.osPath, test.source.replace('draft', 'final'))
    await test.files.readText(test.path)
    for (let n = 0; n < 70; n += 1) {
      test.recovery.remember(
        pathOf(`File ${String(n)}.md`),
        String(n),
        new TextEncoder().encode('Other')
      )
    }
    const result = await test.recovery.saveCopy(test.token, 'My text')
    if (!result.ok) throw new Error(result.error.message)
    expect(await readFile(join(fixture.root, result.value.path), 'utf8')).toContain('status: draft')
  })

  it('captures metadata after successful inspector writes', async () => {
    const test = await captured()
    const written = await test.files.writeKeys(
      test.path,
      [{ key: 'status', value: 'revised' }],
      test.version
    )
    if (!written.ok) throw new Error(written.error.message)
    const token = test.recovery.capture(test.path, written.value.version)
    if (!token.ok) throw new Error(token.error.message)
    await unlink(test.osPath)
    const result = await test.recovery.saveCopy(token.value, 'Draft')
    if (!result.ok) throw new Error(result.error.message)
    expect(await readFile(join(fixture.root, result.value.path), 'utf8')).toContain(
      'status: revised'
    )
  })

  it('keeps earlier pinned tokens valid when captures for newer versions arrive', async () => {
    const test = await captured()
    const written = await test.files.writeKeys(
      test.path,
      [{ key: 'status', value: 'revised' }],
      test.version
    )
    if (!written.ok) throw new Error(written.error.message)
    expect(test.recovery.capture(test.path, written.value.version).ok).toBe(true)
    const result = await test.recovery.saveCopy(test.token, 'Original baseline')
    if (!result.ok) throw new Error(result.error.message)
    expect(await readFile(join(fixture.root, result.value.path), 'utf8')).toContain('status: draft')
  })

  it('refuses read-only projects and snapshots with malformed frontmatter', async () => {
    const path = pathOf('notes/Recovery.md')
    const recovery = createFileRecovery(fixture.root, { readOnly: true, templateFolder: undefined })
    recovery.remember(path, 'valid', new TextEncoder().encode('Text'))
    const token = recovery.capture(path, 'valid')
    if (!token.ok) throw new Error(token.error.message)
    expect(await recovery.saveCopy(token.value, 'Draft')).toMatchObject({
      ok: false,
      error: { code: 'read-only' }
    })
    recovery.remember(path, 'bad', new TextEncoder().encode('---\nbroken: [\n---\nText'))
    expect(recovery.capture(path, 'bad')).toMatchObject({
      ok: false,
      error: { code: 'cannot-edit' }
    })
  })

  it('refuses replacement when the latest disk version has invalid YAML, leaving its bytes untouched', async () => {
    const test = await captured()
    const invalid = '---\ntype: chapter\ncustom: [broken\n---\nOutside text\n'
    await writeFile(test.osPath, invalid)
    const read = await test.files.readText(test.path)
    if (!read.ok) throw new Error(read.error.message)
    const replacement = await test.files.writeText(test.path, 'My draft\n', read.value.version)
    expect(replacement).toMatchObject({ ok: false, error: { code: 'unreadable' } })
    expect(await readFile(test.osPath, 'utf8')).toBe(invalid)
    expect((await test.recovery.saveCopy(test.token, 'My draft\n')).ok).toBe(true)
  })

  it('recovers a template as a note outside the template folder', async () => {
    await mkdir(join(fixture.root, 'templates'), { recursive: true })
    const test = await captured('templates/character.md', '## Description\nTemplate body\n')
    const result = await test.recovery.saveCopy(test.token, 'Kept template draft\n')
    if (!result.ok) throw new Error(result.error.message)
    expect(result.value.path).toBe('character (recovered).md')
    expect(await readFile(join(fixture.root, result.value.path), 'utf8')).toBe(
      '---\ntype: note\n---\nKept template draft\n'
    )
    expect(await readFile(test.osPath, 'utf8')).toBe(test.source)
  })

  it('retains exact mixed line endings and trailing newline state when the body is unchanged', async () => {
    const source = '---\ntype: note\ncustom: true\n---\nOne\r\nTwo\nLast'
    const test = await captured('notes/Recovery.md', source)
    const result = await test.recovery.saveCopy(test.token, 'One\nTwo\nLast')
    if (!result.ok) throw new Error(result.error.message)
    expect(await readFile(join(fixture.root, result.value.path), 'utf8')).toBe(source)
  })

  it('does not recreate missing parent folders and reports failure without touching the draft snapshot', async () => {
    const test = await captured()
    await rename(join(fixture.root, 'notes'), join(fixture.root, 'moved-notes'))
    expect(await test.recovery.saveCopy(test.token, 'Draft')).toMatchObject({
      ok: false,
      error: { code: 'write-failed' }
    })
    expect(test.recovery.capture(test.path, test.version)).toEqual({ ok: true, value: test.token })
  })

  it('does not publish inside a folder that has become a separate project', async () => {
    const test = await captured()
    await writeFile(join(fixture.root, 'notes', 'novel.md'), '---\nformat: 1\n---\n')
    expect(await test.recovery.saveCopy(test.token, 'Draft')).toMatchObject({
      ok: false,
      error: { code: 'write-failed' }
    })
    expect(
      (await readdir(join(fixture.root, 'notes'))).some((name) => name.includes('recovered'))
    ).toBe(false)
  })
})
