/**
 * An expected failure described as plain data, so it can cross IPC unchanged. `code` is stable and
 * machine-readable; `message` is for people.
 */
export interface DomainError<Code extends string = string> {
  readonly code: Code
  readonly message: string
}

/** Creates a `DomainError` with a literal code type. */
export function domainError<Code extends string>(code: Code, message: string): DomainError<Code> {
  return { code, message }
}
