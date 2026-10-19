import { nameComparisonKey } from '../../../../shared-kernel/name-comparison-key'
import type { CodexEntry } from '../../domain/codex-entry'
import type { CodexRepository } from '../../domain/ports/codex-repository'
import type { UntypedFile } from '../../domain/untyped-file'

/** The codex as the side panel lists it: entries sorted by title, and the untyped files. */
export interface CodexListing {
  readonly entries: readonly CodexEntry[]
  readonly untyped: readonly UntypedFile[]
}

/** Lists the project's characters, locations, notes, and untyped files. */
export type ListCodex = () => Promise<CodexListing>

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true })

/** Builds the `ListCodex` query. */
export function createListCodex(ports: { readonly repository: CodexRepository }): ListCodex {
  return async () => {
    const files = await ports.repository.load()
    return {
      entries: [...files.entries].sort(
        (a, b) =>
          collator.compare(nameComparisonKey(a.title), nameComparisonKey(b.title)) ||
          collator.compare(a.path, b.path)
      ),
      untyped: [...files.untyped].sort((a, b) => collator.compare(a.path, b.path))
    }
  }
}
