import type { OutlineSession, ProjectRepository, Revision, VersionRepository, WritingSession } from '@plotdevice/application'
import { channels, restoreVersionSchema, versionSchema, versionsSchema, type CopyVersionResult, type VersionResult, type VersionsView } from '@plotdevice/contracts'
import { splitFrontmatter } from '@plotdevice/markdown'
import { err, ok } from '@plotdevice/shared'
import { parsePayload } from './payload'
import type { PayloadHandler } from './project-ipc'

export interface VersionIpcContext {
  versions: VersionRepository
  writing: WritingSession
  outlines: OutlineSession
  repository: ProjectRepository
  /** "version 25 Oct 2026 18:30", in the interface language: the label of a copied version. */
  copyLabel: (at: number) => string
}

/** Versions of chapters, pages and outlines (Milestone 6). */
export function createVersionHandlers({ versions, writing, outlines, repository, copyLabel }: VersionIpcContext): Record<string, PayloadHandler> {
  const root = (): string | null => writing.project()?.root ?? null

  return {
    [channels.listVersions]: async (payload): Promise<VersionResult<VersionsView>> => {
      const { file } = parsePayload(versionsSchema, payload)
      const projectRoot = root()
      return projectRoot ? versions.list(projectRoot, file) : err('no-project')
    },

    [channels.readVersion]: async (payload): Promise<VersionResult<string>> => {
      const { file, at } = parsePayload(versionSchema, payload)
      const projectRoot = root()
      return projectRoot ? versions.read(projectRoot, file, at) : err('no-project')
    },

    [channels.restoreVersion]: async (payload): Promise<VersionResult<void>> => {
      const { file, at, revision } = parsePayload(restoreVersionSchema, payload)
      const projectRoot = root()
      if (!projectRoot) return err('no-project')
      // Through the writing session, between saves; an open chapter or page shows the restored text.
      const restored = await writing.updateFile(file, () => versions.restore(projectRoot, file, at, revision as Revision), { reload: true })
      if (!restored.ok) return restored
      if (file.startsWith('outlines/')) await outlines.fileChanged(file)
      await writing.refreshProject() // a restored chapter may bring back an older title
      return ok(undefined)
    },

    [channels.copyVersion]: async (payload): Promise<CopyVersionResult> => {
      const { file, at } = parsePayload(versionSchema, payload)
      const projectRoot = root()
      if (!projectRoot) return err('no-project')
      const version = await versions.read(projectRoot, file, at)
      if (!version.ok) return version
      // Named and titled like a "keep both" copy; a chapter's copy gets a new id, a page's none.
      const copy = await repository.saveChapterCopy(projectRoot, file, splitFrontmatter(version.value).body, copyLabel(at))
      if (!copy.ok) return err('write-failed')
      await writing.refreshProject()
      return ok({ copy: copy.value })
    },
  }
}
