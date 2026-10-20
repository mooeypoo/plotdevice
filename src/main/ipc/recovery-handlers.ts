import { z } from 'zod'
import type { ApiResult, CreatedEntryDto } from '../../contract/dtos'
import type { RecoverySession } from '../recovery/recovery-session'
import { parseProjectPath } from '../shared-kernel/project-path'

/** Fixed, validated recovery operations; tokens are scoped to the current project session. */
export function createRecoveryHandlers(current: () => RecoverySession | undefined): {
  capture(args: readonly unknown[]): Promise<ApiResult<string>>
  saveCopy(args: readonly unknown[]): Promise<ApiResult<CreatedEntryDto>>
} {
  function capture(args: readonly unknown[]): ApiResult<string> {
    const recovery = current()
    if (recovery === undefined) return noProject
    const parsed = captureArgs.safeParse(args)
    if (!parsed.success) return invalid
    const path = parseProjectPath(parsed.data[0])
    if (!path.ok) return invalid
    return recovery.capture(path.value, parsed.data[1])
  }
  return {
    capture: (args) => Promise.resolve(capture(args)),
    async saveCopy(args) {
      const recovery = current()
      if (recovery === undefined) return noProject
      const parsed = copyArgs.safeParse(args)
      if (!parsed.success) return invalid
      return recovery.saveCopy(...parsed.data)
    }
  }
}

const captureArgs = z.tuple([z.string().min(1).max(4096), z.string().min(1).max(200)])
const copyArgs = z.tuple([z.uuid(), z.string().max(20_000_000)])
const noProject = {
  ok: false,
  error: { code: 'no-project', message: 'No project is open.' }
} as const
const invalid = {
  ok: false,
  error: { code: 'invalid-request', message: 'The recovery request was not understood.' }
} as const
