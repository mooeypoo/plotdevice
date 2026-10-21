/** Something about novel.md the writer should know, independent of presentation language. */
export type ProjectWarning =
  | {
      readonly code: 'novel-file-unreadable'
      readonly problem:
        'unreadable-file' | 'invalid-encoding' | 'unclosed-frontmatter' | 'unparseable-frontmatter'
    }
  | { readonly code: 'format-missing' | 'title-invalid' | 'author-invalid' | 'settings-invalid' }
  | { readonly code: 'format-invalid'; readonly value: string }
  | { readonly code: 'format-newer'; readonly version: number }
  | {
      readonly code: 'setting-invalid'
      readonly key: string
      readonly value: string
      readonly expected: 'file-name-sync' | 'boolean' | 'folder-mapping' | 'visible-folder'
    }
