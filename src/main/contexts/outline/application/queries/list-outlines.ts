import { isInFolder } from '../../../../shared-kernel/is-in-folder'
import type { OutlineFile } from '../../domain/outline-file'
import type { OutlineSettings } from '../../domain/outline-settings'
import type { OutlineRepository } from '../../domain/ports/outline-repository'

/** Lists the project's outlines by title, leaving out any in the template folder. */
export type ListOutlines = () => Promise<readonly OutlineFile[]>

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true })

/** Builds the `ListOutlines` query. */
export function createListOutlines(ports: {
  readonly repository: OutlineRepository
  readonly settings: OutlineSettings
}): ListOutlines {
  return async () => {
    const { outlines } = await ports.repository.load()
    return outlines
      .filter((outline) => !isInFolder(outline.path, ports.settings.ignoredFolder))
      .sort((a, b) => collator.compare(a.title, b.title) || collator.compare(a.path, b.path))
  }
}
