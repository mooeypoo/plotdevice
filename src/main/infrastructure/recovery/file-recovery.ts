import { randomUUID } from 'node:crypto'
import { realpath } from 'node:fs/promises'
import { dirname, join, relative, isAbsolute, sep } from 'node:path'
import type { RecoverySession, RememberEntryBytes } from '../../recovery/recovery-session'
import { domainError } from '../../shared-kernel/domain-error'
import { nameComparisonKey } from '../../shared-kernel/name-comparison-key'
import {
  joinProjectPath,
  projectPathParent,
  projectPathStem,
  type ProjectPath
} from '../../shared-kernel/project-path'
import { err, ok } from '../../shared-kernel/result'
import { uniqueFileName } from '../../shared-kernel/unique-file-name'
import { createFileAtomically } from '../fs/create-file-atomically'
import { scanProject } from '../project-scan/scan-project'
import { editFrontmatter } from '../markdown/frontmatter-editor'
import {
  composeMarkdownFile,
  fromEditorText,
  splitMarkdownFile,
  type MarkdownFileParts
} from '../markdown/markdown-file'
import { readFrontmatter } from '../markdown/read-frontmatter'

interface Snapshot {
  readonly path: ProjectPath
  readonly version: string
  readonly bytes: Uint8Array
}

/** Builds bounded, in-memory recovery for one project; captures do not write any files. */
export function createFileRecovery(
  root: string,
  options: { readonly readOnly: boolean; readonly templateFolder: ProjectPath | undefined }
): RecoverySession & { readonly remember: RememberEntryBytes } {
  const recent = new Map<string, Snapshot>()
  let byteCount = 0
  const pinned = new Map<string, Snapshot>()
  const unavailable = () =>
    err(
      domainError(
        'snapshot-unavailable',
        'The draft’s recovery snapshot is no longer available. The draft has been kept open.',
        { reason: 'snapshot-unavailable' }
      )
    )

  return {
    remember(path, version, bytes) {
      // Listings may read many files. The active draft's snapshot is pinned separately.
      const key = `${path}\0${version}`
      if (recent.has(key)) return
      const snapshot = { path, version, bytes: Uint8Array.from(bytes) }
      recent.set(key, snapshot)
      byteCount += bytes.byteLength
      while (recent.size > 64 || (byteCount > 64 * 1024 * 1024 && recent.size > 1)) {
        const first = recent.entries().next().value
        if (first === undefined) break
        byteCount -= first[1].bytes.byteLength
        recent.delete(first[0])
      }
    },
    capture(path, version) {
      for (const [token, snapshot] of pinned) {
        if (snapshot.path === path && snapshot.version === version) return ok(token)
      }
      const snapshot = recent.get(`${path}\0${version}`)
      if (snapshot === undefined) return unavailable()
      const frontmatter = readFrontmatter(snapshot.bytes)
      if (frontmatter.kind !== 'read' && frontmatter.kind !== 'none') {
        return err(
          domainError(
            'cannot-edit',
            'This snapshot has invalid frontmatter and cannot be recovered safely.',
            { reason: 'snapshot-invalid' }
          )
        )
      }
      const token = randomUUID()
      pinned.set(token, snapshot)
      if (pinned.size > 8) {
        const oldest = pinned.keys().next().value
        if (oldest !== undefined) pinned.delete(oldest)
      }
      return ok(token)
    },
    async saveCopy(token, text) {
      if (options.readOnly)
        return err(
          domainError('read-only', 'This project is open read-only.', { reason: 'read-only' })
        )
      const snapshot = pinned.get(token)
      if (snapshot === undefined) return unavailable()
      const split = splitMarkdownFile(snapshot.bytes)
      if (split.kind !== 'parts') return unavailable()
      let parts: MarkdownFileParts = split.parts
      const template =
        options.templateFolder !== undefined &&
        snapshot.path.startsWith(`${options.templateFolder}/`)
      if (template) {
        // Recovered templates are ordinary notes, not a replacement for the active template.
        if (parts.head === '') parts = { ...parts, head: '---\ntype: note\n---\n' }
        const edited = editFrontmatter(parts, [{ key: 'type', value: 'note' }])
        if (!edited.ok)
          return err(domainError('cannot-edit', edited.error.message, edited.error.diagnostic))
        parts = edited.value
      }
      const bytes = composeMarkdownFile({ ...parts, body: fromEditorText(text, parts) })
      const parent = template ? undefined : projectPathParent(snapshot.path)
      const folder = parent === undefined ? root : join(root, ...parent.split('/'))
      try {
        const actualRoot = await realpath(root)
        const actualFolder = await realpath(folder)
        const back = relative(actualRoot, actualFolder)
        if (back === '..' || back.startsWith(`..${sep}`) || isAbsolute(back)) {
          return err(
            domainError('write-failed', 'The recovery folder is outside this project.', {
              reason: 'recovery-outside-project'
            })
          )
        }
        const scan = await scanProject(root)
        if (
          parent !== undefined &&
          scan.nestedProjects.some((nested) => parent === nested || parent.startsWith(`${nested}/`))
        ) {
          return err(
            domainError(
              'write-failed',
              'The recovery folder now belongs to a different project. Your draft has been kept open.',
              { reason: 'recovery-nested-project' }
            )
          )
        }
        const taken = new Set(
          scan.files.map((file) => nameComparisonKey(projectPathStem(file.path)))
        )
        const title = `${projectPathStem(snapshot.path)} (recovered)`
        for (let attempt = 0; attempt < 100; attempt += 1) {
          const name = uniqueFileName(title, 'recovered', taken)
          const path = joinProjectPath(parent, name)
          const destination = join(folder, name)
          if (dirname(destination) !== folder) {
            return err(
              domainError('write-failed', 'The recovery destination is invalid.', {
                reason: 'recovery-invalid-destination'
              })
            )
          }
          const created = await createFileAtomically(destination, bytes)
          if (created.ok) return ok({ path })
          if (created.error.code !== 'already-exists')
            return err(domainError('write-failed', created.error.message, created.error.diagnostic))
          taken.add(nameComparisonKey(projectPathStem(path)))
        }
        return err(
          domainError(
            'write-failed',
            'Too many recovery filename collisions. The draft has been kept open.',
            { reason: 'recovery-collisions' }
          )
        )
      } catch (error) {
        return err(
          domainError('write-failed', `Could not save a recovered copy: ${String(error)}`, {
            reason: 'recovery-write-failed',
            detail: String(error)
          })
        )
      }
    }
  }
}
