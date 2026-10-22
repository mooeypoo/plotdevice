import type { ApiResult } from '../../../contract/dtos'
import type { ErrorNotice } from '../shared/error-format'
import { useEditorStore } from './editor-store'
import { useOutlineStore } from './outline-store'

/** A write to an outline, or why it was refused before or by the main process. */
export type OutlineWriteResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: Exclude<ErrorNotice, string | null> }

/**
 * Writes to an outline from outside the editor (capture, board moves) with only one writer
 * (ADR 0018). When the editor holds the outline, its draft is saved first and `write` gets the
 * version it was saved at; an unresolved draft refuses the write. Afterwards the editor loads the
 * new text, and views of the outline re-read it.
 */
export async function writeOutline<T>(
  path: string,
  write: (editorVersion: string | null) => Promise<ApiResult<T>>
): Promise<OutlineWriteResult<T>> {
  const editor = useEditorStore()
  let editorVersion: string | null = null
  if (editor.entry?.path === path) {
    const held = await editor.versionForPropertyChange()
    if (held === undefined) return { ok: false, error: { notice: 'outline-draft-unresolved' } }
    editorVersion = held
  }
  const result = await write(editorVersion)
  if (!result.ok) return result
  if (editor.entry?.path === path) await editor.reloadAfterWrite(path)
  useOutlineStore().touched()
  return result
}
