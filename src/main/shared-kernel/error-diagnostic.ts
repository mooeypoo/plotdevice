/** Semantic failure details for migrated operations; machine-readable codes still drive behavior. */
export type ErrorDiagnostic =
  | {
      readonly reason:
        | 'read-only'
        | 'groups-not-editable'
        | 'not-a-character'
        | 'no-project'
        | 'invalid-request'
        | 'manuscript-entry-not-allowed'
        | 'codex-entry-not-allowed'
        | 'invalid-recovery-request'
        | 'snapshot-unavailable'
        | 'snapshot-invalid'
        | 'recovery-outside-project'
        | 'recovery-nested-project'
        | 'recovery-invalid-destination'
        | 'recovery-collisions'
    }
  | {
      readonly reason:
        | 'file-outside-project'
        | 'file-missing'
        | 'file-unreadable'
        | 'file-changed'
        | 'file-exists'
        | 'manuscript-type-unreadable'
        | 'codex-type-unreadable'
      readonly path: string
    }
  | {
      readonly reason: 'file-unsafe'
      readonly path: string
      readonly operation: 'read' | 'write'
      readonly problem: 'invalid-encoding' | 'unclosed' | 'unparseable' | 'none'
    }
  | {
      readonly reason: 'file-write-failed' | 'file-create-failed'
      readonly path: string
      readonly detail: string
    }
  | { readonly reason: 'recovery-write-failed' | 'recovery-create-failed'; readonly detail: string }
  | {
      readonly reason: 'frontmatter-missing' | 'frontmatter-unparseable' | 'frontmatter-not-mapping'
    }
  | { readonly reason: 'frontmatter-unsupported'; readonly key: string }
