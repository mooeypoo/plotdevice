import { createHash } from 'node:crypto'
import { mkdir, readFile, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { domainError } from '../../../shared-kernel/domain-error'
import type { LinkCandidate } from '../../../shared-kernel/link-index'
import { parseProjectPath, type ProjectPath } from '../../../shared-kernel/project-path'
import { err, ok, type Result } from '../../../shared-kernel/result'
import { toProjectPath } from '../../../infrastructure/fs/to-project-path'
import { writeFileAtomically } from '../../../infrastructure/fs/write-text-file-atomically'
import {
  composeMarkdownFile,
  fromEditorText,
  splitMarkdownFile,
  toEditorText
} from '../../../infrastructure/markdown/markdown-file'
import { editFrontmatter } from '../../../infrastructure/markdown/frontmatter-editor'
import { readFrontmatter } from '../../../infrastructure/markdown/read-frontmatter'
import { scanProject } from '../../../infrastructure/project-scan/scan-project'
import { readChapter, type Chapter } from '../domain/chapter'
import { readPart, type Part } from '../domain/part'
import type {
  ManuscriptRepository,
  ReadEntryTextError,
  WritePropertiesError
} from '../domain/ports/manuscript-repository'
import type { PropertyWrite } from '../domain/property-changes'

const NOVEL_FILE = parseProjectPath('novel.md')

/** The manuscript of the project at `rootOsPath`, as markdown files on disk. */
export function createMarkdownManuscriptRepository(rootOsPath: string): ManuscriptRepository {
  const osPathOf = (path: ProjectPath): string | undefined => {
    const osPath = join(rootOsPath, ...path.split('/'))
    const back = toProjectPath(rootOsPath, osPath)
    return back.ok && back.value === path ? osPath : undefined
  }

  const readBytes = async (
    path: ProjectPath
  ): Promise<Result<{ osPath: string; bytes: Uint8Array }, ReadEntryTextError>> => {
    const osPath = osPathOf(path)
    if (osPath === undefined)
      return err(domainError('not-found', `"${path}" is not in the project.`))
    try {
      return ok({ osPath, bytes: await readFile(osPath) })
    } catch (error) {
      return isMissing(error)
        ? err(domainError('not-found', `"${path}" no longer exists.`))
        : err(domainError('unreadable', `"${path}" can't be read.`))
    }
  }

  /** Reads, edits only the given frontmatter keys, and writes atomically if anything changed. */
  const editProperties = async (
    path: ProjectPath,
    writes: readonly PropertyWrite[],
    expectedVersion: string | undefined
  ): Promise<Result<{ version: string }, WritePropertiesError>> => {
    const read = await readBytes(path)
    if (!read.ok) return read
    const { osPath, bytes } = read.value
    const currentVersion = versionOf(bytes)
    if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
      return err(domainError('changed-on-disk', `"${path}" changed outside Plot Device.`))
    }
    const split = splitMarkdownFile(bytes)
    if (split.kind !== 'parts') {
      return err(domainError('unreadable', `"${path}" can't be written safely (${split.kind}).`))
    }
    const edited = editFrontmatter(split.parts, writes)
    if (!edited.ok) return err(domainError('cannot-edit', edited.error.message))

    const updated = composeMarkdownFile(edited.value)
    if (Buffer.from(updated).equals(Buffer.from(bytes))) return ok({ version: currentVersion })
    try {
      await writeFileAtomically(osPath, updated)
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      return err(domainError('write-failed', `Couldn't save "${path}": ${reason}`))
    }
    return ok({ version: versionOf(updated) })
  }

  return {
    async load() {
      const scan = await scanProject(rootOsPath)
      const parts: Part[] = []
      const chapters: Chapter[] = []
      const linkCandidates: LinkCandidate[] = scan.files.map((file) =>
        file.classification.kind === 'typed'
          ? { path: file.path, type: file.classification.type }
          : { path: file.path }
      )

      for (const file of scan.files) {
        if (file.classification.kind !== 'typed') continue
        const { type } = file.classification
        if (type !== 'part' && type !== 'chapter') continue

        const read = await readBytes(file.path)
        if (!read.ok) continue
        const frontmatter = readFrontmatter(read.value.bytes)
        const split = splitMarkdownFile(read.value.bytes)
        if (frontmatter.kind !== 'read' || split.kind !== 'parts') continue

        const body = toEditorText(split.parts.body)
        if (type === 'part') parts.push(readPart(file.path, frontmatter.data, body))
        else chapters.push(readChapter(file.path, frontmatter.data, body))
      }
      return { parts, chapters, linkCandidates }
    },

    async readText(path) {
      const read = await readBytes(path)
      if (!read.ok) return read
      const split = splitMarkdownFile(read.value.bytes)
      if (split.kind !== 'parts') {
        return err(domainError('unreadable', `"${path}" can't be read safely (${split.kind}).`))
      }
      return ok({
        path,
        text: toEditorText(split.parts.body),
        version: versionOf(read.value.bytes)
      })
    },

    async writeText(path, text, expectedVersion) {
      const read = await readBytes(path)
      if (!read.ok) return read
      const { osPath, bytes } = read.value
      const currentVersion = versionOf(bytes)
      if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
        return err(domainError('changed-on-disk', `"${path}" changed outside Plot Device.`))
      }

      const split = splitMarkdownFile(bytes)
      if (split.kind !== 'parts') {
        return err(domainError('unreadable', `"${path}" can't be written safely (${split.kind}).`))
      }
      const body = fromEditorText(text, split.parts)
      if (body === split.parts.body) return ok({ version: currentVersion })

      const updated = composeMarkdownFile({ ...split.parts, body })
      try {
        await writeFileAtomically(osPath, updated)
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        return err(domainError('write-failed', `Couldn't save "${path}": ${reason}`))
      }
      return ok({ version: versionOf(updated) })
    },

    async readEntryFile(path) {
      const read = await readBytes(path)
      if (!read.ok) return read
      const frontmatter = readFrontmatter(read.value.bytes)
      const type =
        frontmatter.kind === 'read' && isMapping(frontmatter.data)
          ? frontmatter.data['type']
          : undefined
      if (frontmatter.kind !== 'read' || (type !== 'part' && type !== 'chapter')) {
        return err(
          domainError('unreadable', `"${path}" isn't a part or chapter that can be read safely.`)
        )
      }
      return ok({
        path,
        kind: type,
        frontmatter: frontmatter.data,
        version: versionOf(read.value.bytes)
      })
    },

    writeProperties: editProperties,

    async createFile(path, text) {
      const osPath = osPathOf(path)
      if (osPath === undefined)
        return err(domainError('write-failed', `"${path}" is not in the project.`))
      if (await stat(osPath).catch(() => undefined)) {
        return err(domainError('already-exists', `"${path}" already exists.`))
      }
      try {
        await mkdir(dirname(osPath), { recursive: true })
        const bytes = new TextEncoder().encode(text)
        await writeFileAtomically(osPath, bytes)
        return ok({ version: versionOf(bytes) })
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        return err(domainError('write-failed', `Couldn't create "${path}": ${reason}`))
      }
    },

    async readNovelFrontmatter() {
      if (!NOVEL_FILE.ok) return undefined
      const read = await readBytes(NOVEL_FILE.value)
      if (!read.ok) return undefined
      const frontmatter = readFrontmatter(read.value.bytes)
      return frontmatter.kind === 'read' ? frontmatter.data : undefined
    },

    async writeNovelProperties(writes) {
      if (!NOVEL_FILE.ok) return err(domainError('not-found', 'novel.md is missing.'))
      const written = await editProperties(NOVEL_FILE.value, writes, undefined)
      return written.ok ? ok(undefined) : written
    }
  }
}

function versionOf(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

function isMissing(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}

function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
