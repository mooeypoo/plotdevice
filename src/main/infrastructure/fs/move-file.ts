import { randomUUID } from 'node:crypto'
import { mkdir, rename, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'

/** How a move went. The source file is untouched unless the result is `moved`. */
export type MoveResult = 'moved' | 'target-exists' | 'failed'

/**
 * Moves a file within the project, never replacing another file. A case-only rename goes through
 * a hidden temporary name, so it works on case-insensitive file systems (Windows).
 */
export async function moveFile(fromOsPath: string, toOsPath: string): Promise<MoveResult> {
  if (fromOsPath === toOsPath) return 'moved'
  const caseOnly = fromOsPath.toLowerCase() === toOsPath.toLowerCase()
  try {
    if (!caseOnly && (await stat(toOsPath).catch(() => undefined)) !== undefined) {
      return 'target-exists'
    }
    await mkdir(dirname(toOsPath), { recursive: true })
    if (caseOnly) {
      const temporary = join(dirname(fromOsPath), `.plotdevice-rename-${randomUUID()}`)
      await rename(fromOsPath, temporary)
      await rename(temporary, toOsPath)
    } else {
      await rename(fromOsPath, toOsPath)
    }
    return 'moved'
  } catch {
    return 'failed'
  }
}
