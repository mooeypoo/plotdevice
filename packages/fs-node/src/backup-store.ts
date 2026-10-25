import type { BackupStore } from '@plotdevice/application'
import { err, ok } from '@plotdevice/shared'
import { readdir, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { writeAtomically } from './atomic-write'

const BOM = '﻿'

/** `2026-10-25T18:30:12.345Z` as a file name that every file system accepts. */
const nameOf = (at: number): string => `${new Date(at).toISOString().replace(/:/g, '-')}.md`
const timeOf = (name: string): number | null => {
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2})-(\d{2})-(\d{2}\.\d{3}Z)\.md$/.exec(name)
  return match ? Date.parse(`${match[1]}:${match[2]}:${match[3]}`) : null
}

/**
 * Backups in OS app data (ADR 0005, point 9): `backups/<project>/<path of the file>/<time>.md`, one
 * file per backup, written atomically, byte for byte as the original was.
 */
export function createBackupStore(appData: string): BackupStore {
  const folderOf = (project: string, file: string): string => join(appData, 'backups', project.replace(/[^\p{L}\p{N}-]/gu, '_'), ...file.split('/'))

  return {
    async save(project, file, content, at) {
      try {
        const bytes = new TextEncoder().encode((content.hasBom ? BOM : '') + content.text)
        await writeAtomically(join(folderOf(project, file), nameOf(at)), bytes)
        return ok(undefined)
      } catch {
        return err('io')
      }
    },

    async list(project, file) {
      const names = await readdir(folderOf(project, file)).catch(() => [] as string[])
      return names
        .flatMap((name) => {
          const at = timeOf(name)
          return at === null ? [] : [{ at }]
        })
        .sort((a, b) => b.at - a.at)
    },

    async read(project, file, at) {
      let bytes: Uint8Array
      try {
        bytes = await readFile(join(folderOf(project, file), nameOf(at)))
      } catch {
        return err('missing')
      }
      try {
        const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes)
        return ok({ text: text.startsWith(BOM) ? text.slice(1) : text, hasBom: text.startsWith(BOM) })
      } catch {
        return err('unreadable')
      }
    },

    async remove(project, file, times) {
      await Promise.all(times.map((at) => rm(join(folderOf(project, file), nameOf(at)), { force: true })))
    },
  }
}
