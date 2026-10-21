import type { ErrorDiagnostic } from './error-diagnostic'

/**
 * An expected failure described as plain data, so it can cross IPC unchanged. `code` is stable and
 * machine-readable. Migrated operations carry semantic `diagnostic` details; `message` remains
 * the explicit compatibility description for operations whose presentation is not yet migrated.
 */
export interface DomainError<Code extends string = string> {
  readonly code: Code
  readonly message: string
  readonly diagnostic?: ErrorDiagnostic
}

/** Creates a `DomainError` with a literal code type. */
export function domainError<Code extends string>(
  code: Code,
  message: string,
  diagnostic?: ErrorDiagnostic
): DomainError<Code> {
  return { code, message, ...(diagnostic === undefined ? {} : { diagnostic }) }
}
