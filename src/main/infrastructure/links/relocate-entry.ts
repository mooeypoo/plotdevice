import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { EntryType } from '../../shared-kernel/entry-type'
import { buildLinkIndex, type LinkCandidate } from '../../shared-kernel/link-index'
import type { ProjectPath } from '../../shared-kernel/project-path'
import { linkKeyType } from '../../shared-kernel/link-key-type'
import { retargetWikiLink } from '../../shared-kernel/retarget-wiki-link'
import { formatWikiLink, type WikiLink } from '../../shared-kernel/wiki-link'
import { moveFile, type MoveResult } from '../fs/move-file'
import { writeFileAtomically } from '../fs/write-text-file-atomically'
import {
  composeMarkdownFile,
  splitMarkdownFile,
  type MarkdownFileParts
} from '../markdown/markdown-file'
import { rewriteFrontmatterLinks } from '../markdown/frontmatter-link-rewriter'
import { rewriteWikiLinks } from '../markdown/link-rewriter'
import { scanProject } from '../project-scan/scan-project'

/** What relocating an entry would change, or did. */
export interface RelocationReport {
  /** Files whose links point to the entry and are (or would be) updated. */
  readonly changedFiles: readonly ProjectPath[]
  readonly linkCount: number
  /** Files that seem to link to the entry but couldn't be updated safely; left untouched. */
  readonly skipped: readonly ProjectPath[]
}

interface PlannedEdit {
  readonly path: ProjectPath
  readonly before: Uint8Array
  readonly parts: MarkdownFileParts
  readonly count: number
}

/**
 * Plans the link changes for moving or renaming `oldPath` to `newPath`, without writing anything.
 */
export async function previewRelocation(
  rootOsPath: string,
  oldPath: ProjectPath,
  newPath: ProjectPath
): Promise<RelocationReport> {
  const plan = await planLinkEdits(rootOsPath, oldPath, newPath)
  return report(plan.edits, plan.skipped)
}

/**
 * Moves or renames `oldPath` to `newPath` and updates every link to it across the project. The
 * file moves first; if that fails, nothing else is touched. A linking file that changed since the
 * plan was made is skipped and reported.
 */
export async function relocateEntry(
  rootOsPath: string,
  oldPath: ProjectPath,
  newPath: ProjectPath
): Promise<{ readonly move: MoveResult; readonly report: RelocationReport }> {
  const plan = await planLinkEdits(rootOsPath, oldPath, newPath)
  const move = await moveFile(osPathOf(rootOsPath, oldPath), osPathOf(rootOsPath, newPath))
  if (move !== 'moved') return { move, report: { changedFiles: [], linkCount: 0, skipped: [] } }

  const written: PlannedEdit[] = []
  const skipped = [...plan.skipped]
  for (const edit of plan.edits) {
    const where = edit.path === oldPath ? newPath : edit.path
    const osPath = osPathOf(rootOsPath, where)
    const now = await readFile(osPath).catch(() => undefined)
    if (now === undefined || !Buffer.from(now).equals(Buffer.from(edit.before))) {
      skipped.push(where)
      continue
    }
    try {
      await writeFileAtomically(osPath, composeMarkdownFile(edit.parts))
      written.push({ ...edit, path: where })
    } catch {
      skipped.push(where)
    }
  }
  return { move, report: report(written, skipped) }
}

async function planLinkEdits(
  rootOsPath: string,
  oldPath: ProjectPath,
  newPath: ProjectPath
): Promise<{ readonly edits: PlannedEdit[]; readonly skipped: ProjectPath[] }> {
  const scan = await scanProject(rootOsPath)
  const candidates: LinkCandidate[] = scan.files.map((file) =>
    file.classification.kind === 'typed'
      ? { path: file.path, type: file.classification.type }
      : { path: file.path }
  )
  const index = buildLinkIndex(candidates)
  const oldStem = oldPath.slice(oldPath.lastIndexOf('/') + 1).replace(/\.md$/iu, '')

  const pointsToOld = (link: WikiLink, expectedType: EntryType | undefined): boolean => {
    const resolution = index.resolve(link, expectedType)
    return resolution.kind === 'resolved' && resolution.path === oldPath
  }
  const retarget = (link: WikiLink): string => formatWikiLink(retargetWikiLink(link, newPath))

  const edits: PlannedEdit[] = []
  const skipped: ProjectPath[] = []
  for (const file of scan.files) {
    const bytes = await readFile(osPathOf(rootOsPath, file.path)).catch(() => undefined)
    if (bytes === undefined) continue
    const split = splitMarkdownFile(bytes)
    if (split.kind !== 'parts') {
      if (Buffer.from(bytes).toString('latin1').includes(oldStem)) skipped.push(file.path)
      continue
    }
    const { parts } = split
    const body = rewriteWikiLinks(
      parts.body,
      (link) => (pointsToOld(link, undefined) ? retarget(link) : undefined),
      { skipCode: true }
    )
    const head = rewriteFrontmatterLinks(parts.head, (link, key) =>
      pointsToOld(link, linkKeyType(key)) ? retarget(link) : undefined
    )
    if (head.kind !== 'rewritten') {
      if (parts.head.includes(oldStem) || body.count > 0) skipped.push(file.path)
      continue
    }
    if (body.count + head.count === 0) continue
    edits.push({
      path: file.path,
      before: bytes,
      parts: { ...parts, head: head.head, body: body.text },
      count: body.count + head.count
    })
  }
  return { edits, skipped }
}

function report(edits: readonly PlannedEdit[], skipped: readonly ProjectPath[]): RelocationReport {
  return {
    changedFiles: edits.map((edit) => edit.path),
    linkCount: edits.reduce((total, edit) => total + edit.count, 0),
    skipped
  }
}

function osPathOf(rootOsPath: string, path: ProjectPath): string {
  return join(rootOsPath, ...path.split('/'))
}
