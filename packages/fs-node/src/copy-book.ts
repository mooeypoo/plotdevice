import { cp, mkdir, readdir } from 'node:fs/promises'
import { basename, join, relative, resolve } from 'node:path'

/**
 * "Make a backup now" (Milestone 18): the whole book folder, copied into `location` as
 * "<book> backup <date>", or "<book> backup <date> 2" when that is taken. Never replaces anything,
 * and never copies a book into itself. Returns the copy's path, or `null` when it couldn't.
 */
export async function copyBook(root: string, location: string, at: Date = new Date()): Promise<string | null> {
  const inside = relative(resolve(root), resolve(location))
  if (inside === '' || (!inside.startsWith('..') && !inside.startsWith('/'))) return null
  const date = at.toISOString().slice(0, 10)
  for (let n = 1; n < 100; n++) {
    const target = join(location, `${basename(root)} backup ${date}${n === 1 ? '' : ` ${n}`}`)
    try {
      // `mkdir` without `recursive` fails if the name is taken, so two copies never mix.
      await mkdir(target)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') continue
      return null
    }
    try {
      for (const entry of await readdir(root))
        await cp(join(root, entry), join(target, entry), { recursive: true, errorOnExist: true, force: false, preserveTimestamps: true })
      return target
    } catch {
      return null
    }
  }
  return null
}
