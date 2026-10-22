/** The longest layout name, in characters. */
export const LAYOUT_NAME_MAX = 80

/** Why a layout name was refused. */
export type LayoutNameProblem = 'name-empty' | 'name-too-long'

/** The trimmed NFC name, or why it can't be used. */
export function checkLayoutName(
  name: string
):
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly error: LayoutNameProblem } {
  const normalized = name.normalize('NFC').trim()
  if (normalized === '') return { ok: false, error: 'name-empty' }
  // Count what a reader sees as characters: a letter with its niqqud or accents counts once.
  const characters = [
    ...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(normalized)
  ]
  if (characters.length > LAYOUT_NAME_MAX) return { ok: false, error: 'name-too-long' }
  return { ok: true, value: normalized }
}

/** The trimmed NFC name, or `undefined` if it can't be used. */
export function validLayoutName(name: string): string | undefined {
  const checked = checkLayoutName(name)
  return checked.ok ? checked.value : undefined
}

/** Names that compare equal here clash, as file names do: NFC, then locale-independent case-folding. */
export function layoutNameKey(name: string): string {
  return name.normalize('NFC').trim().toLowerCase()
}
