import { randomUUID } from 'node:crypto'
import { link, unlink } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { domainError, type DomainError } from '../../shared-kernel/domain-error'
import { err, ok, type Result } from '../../shared-kernel/result'
import { ownWrites } from '../watching/own-writes'
import { writeFileAtomically } from './write-text-file-atomically'

/**
 * Publishes a completely written sibling temporary file with an exclusive hard link. Unlike a
 * rename, link fails if the destination appeared meanwhile; no existing file is ever replaced.
 */
export async function createFileAtomically(
  path: string,
  bytes: Uint8Array
): Promise<Result<void, DomainError<'already-exists' | 'write-failed'>>> {
  const temporary = join(dirname(path), `.plotdevice-recovery-${randomUUID()}.tmp`)
  try {
    await writeFileAtomically(temporary, bytes)
    ownWrites.expectWrite(path, bytes)
    await link(temporary, path)
    return ok(undefined)
  } catch (error) {
    return err(
      domainError(
        isAlreadyPresent(error) ? 'already-exists' : 'write-failed',
        `Could not create recovered file: ${String(error)}`,
        { reason: 'recovery-create-failed', detail: String(error) }
      )
    )
  } finally {
    try {
      await unlink(temporary)
    } catch (error) {
      if (!isMissing(error)) console.error('Could not remove recovery temporary file.', error)
    }
  }
}

function isAlreadyPresent(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'EEXIST'
}

function isMissing(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}
