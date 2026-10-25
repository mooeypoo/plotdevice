import { spawn } from 'node:child_process'
import { chmod, lstat, mkdtemp, readdir, readFile, rename, rm, stat, symlink, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { AtomicWriteError, removeStaleTempFiles, writeAtomically } from './atomic-write'

const dirs: string[] = []
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})
async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'plotdevice-fs-node-'))
  dirs.push(dir)
  return dir
}
const bytes = (text: string): Uint8Array => new TextEncoder().encode(text)
const isPosix = process.platform !== 'win32'

describe('writeAtomically', () => {
  it('replaces the content and leaves no temp file behind', async () => {
    const dir = await tempDir()
    const target = join(dir, 'chapter.md')
    await writeFile(target, 'old')
    await writeAtomically(target, bytes('new — חדש'))
    expect(await readFile(target, 'utf8')).toBe('new — חדש')
    expect(await readdir(dir)).toEqual(['chapter.md'])
  })

  it('creates a file that does not exist yet', async () => {
    const dir = await tempDir()
    await writeAtomically(join(dir, 'new.json'), bytes('{}'))
    expect(await readFile(join(dir, 'new.json'), 'utf8')).toBe('{}')
  })

  it.runIf(isPosix)('keeps the file mode', async () => {
    const dir = await tempDir()
    const target = join(dir, 'private.md')
    await writeFile(target, 'old')
    await chmod(target, 0o600)
    await writeAtomically(target, bytes('new'))
    expect((await stat(target)).mode & 0o777).toBe(0o600)
  })

  it.runIf(isPosix)('writes through a symlink and keeps the link', async () => {
    const dir = await tempDir()
    await writeFile(join(dir, 'real.md'), 'old')
    await symlink('real.md', join(dir, 'link.md'))
    await writeAtomically(join(dir, 'link.md'), bytes('new'))
    expect(await readFile(join(dir, 'real.md'), 'utf8')).toBe('new')
    expect((await lstat(join(dir, 'link.md'))).isSymbolicLink()).toBe(true)
  })

  it.runIf(isPosix && process.getuid?.() !== 0)('refuses a read-only file instead of replacing it', async () => {
    const dir = await tempDir()
    const target = join(dir, 'locked.md')
    await writeFile(target, 'keep me')
    await chmod(target, 0o444)
    await expect(writeAtomically(target, bytes('new'))).rejects.toMatchObject({ code: 'read-only' })
    expect(await readFile(target, 'utf8')).toBe('keep me')
  })

  it('retries a Windows-style sharing violation, then succeeds', async () => {
    const dir = await tempDir()
    const target = join(dir, 'chapter.md')
    await writeFile(target, 'old')
    let attempts = 0
    await writeAtomically(target, bytes('new'), {
      rename: async (from, to) => {
        if (++attempts <= 3) throw Object.assign(new Error('EBUSY'), { code: 'EBUSY' })
        await rename(from, to)
      },
    })
    expect(attempts).toBe(4)
    expect(await readFile(target, 'utf8')).toBe('new')
  })

  it('gives up on a file that stays locked, with a clear error and nothing left behind', async () => {
    const dir = await tempDir()
    const target = join(dir, 'chapter.md')
    await writeFile(target, 'old')
    const error = await writeAtomically(target, bytes('new'), {
      rename: async () => {
        throw Object.assign(new Error('EPERM'), { code: 'EPERM' })
      },
    }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(AtomicWriteError)
    expect((error as AtomicWriteError).code).toBe('locked')
    expect(await readFile(target, 'utf8')).toBe('old')
    expect(await readdir(dir)).toEqual(['chapter.md'])
  })

  it('leaves the original intact when something fails just before the rename', async () => {
    const dir = await tempDir()
    const target = join(dir, 'chapter.md')
    await writeFile(target, 'old')
    await expect(
      writeAtomically(target, bytes('new'), {
        beforeRename: () => {
          throw new Error('disk full')
        },
      }),
    ).rejects.toMatchObject({ code: 'io' })
    expect(await readFile(target, 'utf8')).toBe('old')
    expect(await readdir(dir)).toEqual(['chapter.md'])
  })

  it('leaves the file whole, old or new, never partial, when the process is killed mid-write', async () => {
    const dir = await tempDir()
    const target = join(dir, 'chapter.md')
    await writeFile(target, 'ORIGINAL\n')
    const versionsSeen = new Set<string>()
    for (const delay of [15, 45, 30, 60, 20, 50, 35, 25]) {
      const child = spawn(process.execPath, [join(import.meta.dirname, 'write-loop.fixture.ts'), target], { stdio: ['ignore', 'pipe', 'ignore'] })
      // Wait until it is writing: a busy machine can take longer than `delay` just to start Node.
      await new Promise((resolve) => child.stdout.once('data', resolve))
      await new Promise((resolve) => setTimeout(resolve, delay))
      child.kill('SIGKILL')
      await new Promise((resolve) => child.on('exit', resolve))
      const content = await readFile(target, 'utf8')
      expect(content === 'ORIGINAL\n' || /^BEGIN ([AB])\n\1+\nEND \1\n$/.test(content), `partial file: ${content.length} characters`).toBe(true)
      versionsSeen.add(content.slice(0, 7))
    }
    expect(versionsSeen.size).toBeGreaterThan(1) // the kills really landed while writing
  }, 60_000)
})

describe('removeStaleTempFiles', () => {
  it('removes old hidden temp files left by a crash, but not fresh ones or anything else', async () => {
    const dir = await tempDir()
    await writeFile(join(dir, '.chapter.md.a1b2c3d4.plotdevice-tmp'), 'stale')
    await writeFile(join(dir, '.chapter.md.ffff0000.plotdevice-tmp'), 'fresh')
    await writeFile(join(dir, 'chapter.md'), 'keep')
    const old = new Date(Date.now() - 5 * 60_000)
    await utimes(join(dir, '.chapter.md.a1b2c3d4.plotdevice-tmp'), old, old)
    expect(await removeStaleTempFiles(dir)).toEqual(['.chapter.md.a1b2c3d4.plotdevice-tmp'])
    expect((await readdir(dir)).sort()).toEqual(['.chapter.md.ffff0000.plotdevice-tmp', 'chapter.md'])
  })
})
