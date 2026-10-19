import { readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { classifyEntryType, type EntryClassification } from '../../shared-kernel/entry-type'
import type { ProjectPath } from '../../shared-kernel/project-path'
import { toProjectPath } from '../fs/to-project-path'
import { readFrontmatter, type FrontmatterReading } from '../markdown/read-frontmatter'

/** Why a file's frontmatter couldn't be read. */
export type ScanProblem =
  'unreadable-file' | 'invalid-encoding' | 'unclosed-frontmatter' | 'unparseable-frontmatter'

/** One markdown file and what its `type` key says it is. */
export interface ScannedMarkdownFile {
  readonly path: ProjectPath
  readonly classification: EntryClassification
  readonly problem?: ScanProblem
}

/** Every markdown file in a project, sorted by path, plus nested projects that were skipped. */
export interface ProjectScanResult {
  readonly files: readonly ScannedMarkdownFile[]
  readonly nestedProjects: readonly ProjectPath[]
}

const NOVEL_FILE = 'novel.md'

/**
 * Finds every `.md` file under `rootOsPath` and classifies it by its `type` key. Skips anything
 * whose name starts with a dot, folders reached through symlinks, and nested projects.
 */
export async function scanProject(rootOsPath: string): Promise<ProjectScanResult> {
  const files: ScannedMarkdownFile[] = []
  const nestedProjects: ProjectPath[] = []

  const walk = async (folder: string, isRoot: boolean): Promise<void> => {
    const entries = await readdir(folder, { withFileTypes: true })
    if (!isRoot && entries.some((entry) => entry.name === NOVEL_FILE)) {
      const nested = toProjectPath(rootOsPath, folder)
      if (nested.ok) nestedProjects.push(nested.value)
      return
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      const osPath = join(folder, entry.name)

      let isFolder = entry.isDirectory()
      let isFile = entry.isFile()
      if (entry.isSymbolicLink()) {
        // Following linked folders risks loops and leaving the project; linked files are fine.
        const target = await stat(osPath).catch(() => undefined)
        isFolder = false
        isFile = target?.isFile() ?? false
      }

      if (isFolder) {
        await walk(osPath, false)
        continue
      }
      if (!isFile || !entry.name.toLowerCase().endsWith('.md')) continue
      if (isRoot && entry.name === NOVEL_FILE) continue

      const path = toProjectPath(rootOsPath, osPath)
      if (!path.ok) continue
      files.push(await scanFile(path.value, osPath))
    }
  }

  await walk(rootOsPath, true)
  files.sort((a, b) => compareCodePoints(a.path, b.path))
  nestedProjects.sort(compareCodePoints)
  return { files, nestedProjects }
}

async function scanFile(path: ProjectPath, osPath: string): Promise<ScannedMarkdownFile> {
  let bytes: Uint8Array
  try {
    bytes = await readFile(osPath)
  } catch {
    return { path, classification: { kind: 'untyped' }, problem: 'unreadable-file' }
  }
  return classify(path, readFrontmatter(bytes))
}

function classify(path: ProjectPath, reading: FrontmatterReading): ScannedMarkdownFile {
  switch (reading.kind) {
    case 'read': {
      const type = isMapping(reading.data) ? reading.data['type'] : undefined
      return { path, classification: classifyEntryType(type) }
    }
    case 'none':
      return { path, classification: { kind: 'untyped' } }
    case 'invalid-encoding':
      return { path, classification: { kind: 'untyped' }, problem: 'invalid-encoding' }
    case 'unclosed':
      return { path, classification: { kind: 'untyped' }, problem: 'unclosed-frontmatter' }
    case 'unparseable':
      return { path, classification: { kind: 'untyped' }, problem: 'unparseable-frontmatter' }
  }
}

function isMapping(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** A locale-independent order, so scans are identical on every machine. */
function compareCodePoints(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}
