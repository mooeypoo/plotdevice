/** Semantic failure details for migrated operations; machine-readable codes still drive behavior. */
export type ErrorDiagnostic =
  | {
      readonly reason: 'workspace-folder-inspection-failed'
      readonly path: string
      readonly detail: string
    }
  | {
      readonly reason: 'workspace-folder-search-limit'
      readonly path: string
      readonly limit: number
    }
  | { readonly reason: 'workspace-folder-dialog-failed'; readonly detail: string }
  | {
      readonly reason: 'recents-read-failed' | 'recents-save-failed' | 'recents-invalid'
      readonly path: string
      readonly detail: string
    }
  | {
      readonly reason:
        | 'read-only'
        | 'workspace-folder-not-allowed'
        | 'template-folder-unusable'
        | 'entry-already-typed'
        | 'frontmatter-links-unsafe'
        | 'name-matches'
        | 'part-required'
        | 'chapter-missing'
        | 'part-missing'
        | 'groups-not-editable'
        | 'not-a-character'
        | 'no-project'
        | 'invalid-request'
        | 'manuscript-entry-not-allowed'
        | 'codex-entry-not-allowed'
        | 'outline-not-allowed'
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
        | 'workspace-folder-missing'
        | 'workspace-not-project'
        | 'workspace-already-project'
        | 'workspace-inside-project'
        | 'workspace-contains-project'
        | 'file-missing'
        | 'file-unreadable'
        | 'file-changed'
        | 'file-exists'
        | 'file-move-failed'
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
  | { readonly reason: 'link-needs-no-folder'; readonly name: string }
  | { readonly reason: 'key-needs-no-quotes'; readonly key: string }
  | { readonly reason: 'outline-shape-changed' | 'outline-invalid-beat' | 'outline-invalid-notes' }
