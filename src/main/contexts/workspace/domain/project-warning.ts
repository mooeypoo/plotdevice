/** Why a project opened with a warning. Each code maps to one rule in docs/file-format.md. */
export type ProjectWarningCode =
  | 'novel-file-unreadable'
  | 'format-missing'
  | 'format-invalid'
  | 'format-newer'
  | 'title-invalid'
  | 'author-invalid'
  | 'settings-invalid'
  | 'setting-invalid'

/** Something about `novel.md` the writer should know. The file itself is never changed because of it. */
export interface ProjectWarning {
  readonly code: ProjectWarningCode
  readonly message: string
}
