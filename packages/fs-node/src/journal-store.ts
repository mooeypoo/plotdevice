import type { JournalEntry, JournalStore } from '@plotdevice/application'
import { readdir, readFile, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { writeAtomically } from './atomic-write'

/**
 * Recovery journals in `<app data>/journals/<project id>/` (ADR 0005): outside the project, so nothing
 * appears in the author's folder. An entry holds the full new contents, so recovery never needs to
 * read anything but the project and the journal.
 */
export function createJournalStore(appData: string): JournalStore {
  const folder = (projectId: string): string => join(appData, 'journals', projectId.replace(/[^A-Za-z0-9-]/g, '_'))
  return {
    async save(projectId, entry) {
      await writeAtomically(join(folder(projectId), `${entry.id}.json`), new TextEncoder().encode(`${JSON.stringify(entry, null, 2)}\n`))
    },
    async list(projectId) {
      const names = await readdir(folder(projectId)).catch(() => [] as string[])
      const entries: JournalEntry[] = []
      for (const name of names.filter((n) => n.endsWith('.json')).sort()) {
        // An unreadable journal stays on disk for a person to look at; it is never deleted silently.
        const entry = await readFile(join(folder(projectId), name), 'utf8').then(
          (text) => JSON.parse(text) as JournalEntry,
          () => null,
        )
        if (entry) entries.push(entry)
      }
      return entries
    },
    async remove(projectId, entryId) {
      await unlink(join(folder(projectId), `${entryId}.json`)).catch(() => undefined)
    },
  }
}
