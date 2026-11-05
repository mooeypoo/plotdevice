import type { BackupContents, BackupFileInfo, BookBackups } from '@plotdevice/application'
import { err, ok, type ProjectPath } from '@plotdevice/shared'
import { unzip, zip, type Unzipped, type Zippable } from 'fflate'
import { mkdir, open, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'

const BOM = '﻿'

const zipped = (files: Zippable): Promise<Uint8Array> =>
  new Promise((done, fail) => zip(files, { level: 6 }, (error, data) => (error ? fail(error) : done(data))))
const unzipped = (data: Uint8Array): Promise<Unzipped> =>
  new Promise((done, fail) => unzip(data, (error, files) => (error ? fail(error) : done(files))))

async function filesIn(root: string): Promise<string[]> {
  const entries = await readdir(root, { recursive: true, withFileTypes: true })
  return entries.filter((entry) => entry.isFile()).map((entry) => relative(root, join(entry.parentPath, entry.name)).split(sep).join('/'))
}

/** Each entry inside the zip sits in a folder named after the book, so unzipping by hand gives a book folder. */
const withoutTopFolder = (name: string): string => name.slice(name.indexOf('/') + 1)

const isInside = (folder: string, root: string): boolean => {
  const inside = relative(resolve(root), resolve(folder))
  return inside === '' || (!inside.startsWith('..') && !inside.startsWith('/') && !/^[A-Za-z]:/.test(inside))
}

/** Backups as zip files (Milestone 20). */
export function createBookBackups(): BookBackups {
  return {
    async save(root, folder, name) {
      if (isInside(folder, root)) return err('inside-book')
      try {
        if (!(await stat(folder)).isDirectory()) return err('missing-folder')
      } catch {
        return err('missing-folder')
      }
      const target = join(folder, name)
      const partial = join(folder, `.${name}.partial`)
      try {
        const top = basename(root)
        const files: Zippable = {}
        for (const path of await filesIn(root)) files[`${top}/${path}`] = new Uint8Array(await readFile(join(root, path)))
        const data = await zipped(files)
        // `wx`: never over an existing file, a backup or anything else.
        const handle = await open(partial, 'wx')
        try {
          await handle.writeFile(data)
          await handle.sync()
        } finally {
          await handle.close()
        }
        try {
          await stat(target)
          await rm(partial, { force: true })
          return err('failed')
        } catch {
          await rename(partial, target)
        }
        return ok(target)
      } catch (error) {
        await rm(partial, { force: true }).catch(() => undefined)
        return err((error as NodeJS.ErrnoException).code === 'ENOSPC' ? 'no-space' : 'failed')
      }
    },

    async list(folder) {
      try {
        const entries = await readdir(folder, { withFileTypes: true })
        const zips = entries.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.zip') && !entry.name.startsWith('.'))
        const found: BackupFileInfo[] = []
        for (const entry of zips) {
          const file = join(folder, entry.name)
          found.push({ file, name: entry.name, modifiedAt: (await stat(file)).mtimeMs })
        }
        return ok(found.sort((a, b) => a.name.localeCompare(b.name)))
      } catch {
        return err('missing-folder')
      }
    },

    async read(file) {
      try {
        const entries = await unzipped(new Uint8Array(await readFile(file)))
        // `ignoreBOM` keeps a leading BOM in the text, so it can be noted and written back as it was.
        const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true })
        const files: BackupContents['files'] = []
        for (const [name, bytes] of Object.entries(entries)) {
          const path = withoutTopFolder(name)
          if (name.endsWith('/') || !path.toLowerCase().endsWith('.md')) continue
          const text = decoder.decode(bytes)
          files.push({ path: path as ProjectPath, text: text.startsWith(BOM) ? text.slice(1) : text, hasBom: text.startsWith(BOM) })
        }
        return ok({ files })
      } catch {
        return err('unreadable')
      }
    },

    async unpack(file, location, name) {
      let entries: Unzipped
      try {
        entries = await unzipped(new Uint8Array(await readFile(file)))
      } catch {
        return err('unreadable')
      }
      const target = join(location, name)
      try {
        // Without `recursive`, `mkdir` fails if the name is taken, so nothing is ever unpacked over another folder.
        await mkdir(target)
      } catch (error) {
        return err((error as NodeJS.ErrnoException).code === 'EEXIST' ? 'exists' : 'failed')
      }
      try {
        for (const [entry, bytes] of Object.entries(entries)) {
          const path = withoutTopFolder(entry)
          if (entry.endsWith('/') || path === '') continue
          const destination = resolve(target, path)
          // A zip can name paths outside its folder ("../"); those are never written.
          if (!isInside(destination, target) || destination === resolve(target)) continue
          await mkdir(dirname(destination), { recursive: true })
          await writeFile(destination, bytes, { flag: 'wx' })
        }
        return ok(target)
      } catch {
        return err('failed')
      }
    },

    async remove(file) {
      try {
        await rm(file)
        return true
      } catch {
        return false
      }
    },

    async folderExists(folder) {
      try {
        return (await stat(folder)).isDirectory()
      } catch {
        return false
      }
    },
  }
}
