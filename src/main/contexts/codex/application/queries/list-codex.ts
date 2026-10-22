import { isInFolder } from '../../../../shared-kernel/is-in-folder'
import { nameComparisonKey } from '../../../../shared-kernel/name-comparison-key'
import type { ProjectPath } from '../../../../shared-kernel/project-path'
import { CODEX_KINDS, type CodexEntry, type CodexKind } from '../../domain/codex-entry'
import type { CodexSettings } from '../../domain/codex-settings'
import type { CodexRepository } from '../../domain/ports/codex-repository'
import type { UntypedFile } from '../../domain/untyped-file'
import { templatePath } from '../template-path'

/** A kind's template file, and whether the writer has made one yet. */
export interface CodexTemplate {
  readonly kind: CodexKind
  readonly path: ProjectPath
  readonly exists: boolean
}

/** The codex as the side panel lists it: entries sorted by title, untyped files, and templates. */
export interface CodexListing {
  readonly entries: readonly CodexEntry[]
  readonly untyped: readonly UntypedFile[]
  /** Empty when the template folder setting is unusable. */
  readonly templates: readonly CodexTemplate[]
}

/** Lists the project's characters, locations, notes, untyped files, and templates. */
export type ListCodex = () => Promise<CodexListing>

const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true })

/** Builds the `ListCodex` query. Files in the template folder are templates, not entries. */
export function createListCodex(ports: {
  readonly repository: CodexRepository
  readonly settings: CodexSettings
}): ListCodex {
  return async () => {
    const files = await ports.repository.load()
    const outside = (file: { readonly path: ProjectPath }): boolean =>
      !isInFolder(file.path, ports.settings.templateFolder)
    const existing = new Set(
      [...files.linkCandidates, ...files.untyped].map((file) => nameComparisonKey(file.path))
    )
    return {
      entries: files.entries
        .filter(outside)
        .sort(
          (a, b) =>
            collator.compare(nameComparisonKey(a.title), nameComparisonKey(b.title)) ||
            collator.compare(a.path, b.path)
        ),
      untyped: files.untyped.filter(outside).sort((a, b) => collator.compare(a.path, b.path)),
      templates: CODEX_KINDS.flatMap((kind) => {
        const path = templatePath(ports.settings, kind)
        return path === undefined
          ? []
          : [{ kind, path, exists: existing.has(nameComparisonKey(path)) }]
      })
    }
  }
}
