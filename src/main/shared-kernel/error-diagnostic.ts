/** Semantic save/recovery details; machine-readable codes continue to drive application behavior. */
export type ErrorDiagnostic =
  | {
      readonly reason:
        | 'read-only'
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
        'file-outside-project' | 'file-missing' | 'file-unreadable' | 'file-changed' | 'file-exists'
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
