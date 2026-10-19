import { domainError } from '../../../shared-kernel/domain-error'
import { err, ok } from '../../../shared-kernel/result'
import { previewRelocation, relocateEntry } from '../../../infrastructure/links/relocate-entry'
import type { EntryRelocator } from '../domain/ports/entry-relocator'

/** Moves and renames files of the project at `rootOsPath`, updating links in every markdown file. */
export function createMarkdownEntryRelocator(rootOsPath: string): EntryRelocator {
  return {
    preview: (from, to) => previewRelocation(rootOsPath, from, to),
    async relocate(from, to) {
      const { move, report } = await relocateEntry(rootOsPath, from, to)
      switch (move) {
        case 'moved':
          return ok(report)
        case 'target-exists':
          return err(domainError('already-exists', `"${to}" already exists.`))
        case 'failed':
          return err(domainError('move-failed', `"${from}" couldn't be moved.`))
      }
    }
  }
}
