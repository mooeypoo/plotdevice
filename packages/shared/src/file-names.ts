import { collisionKey, isReservedName } from './project-path'

const MAX_STEM_CHARACTERS = 100
/** Forbidden on Windows, plus characters that would complicate Markdown links (`[]()#%{}`). */
const UNSAFE_IN_FILE_NAMES = /[<>:"/\\|?*\u0000-\u001f[\]()#%{}]/g

/**
 * A file or folder name from a title: lower case, spaces as `-`, letters of any script kept (Hebrew
 * stays Hebrew), nothing a file system or a Markdown link would trip on. `fallback` names it when the
 * title has no usable characters, and suffixes a reserved name (`con-chapter`).
 */
export function safeFileStem(title: string, fallback = 'chapter'): string {
  const slug = title
    .normalize('NFC')
    .toLowerCase()
    .replace(UNSAFE_IN_FILE_NAMES, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
  const short = Array.from(slug)
    .slice(0, MAX_STEM_CHARACTERS)
    .join('')
    .replace(/[-.]+$/, '')
  if (short === '') return fallback
  return isReservedName(short) ? `${short}-${fallback}` : short
}

/**
 * A new folder named from `name` (a kind's plural, ADR 0011), made safe and free: taken names, in any
 * case, get `-2`, `-3`…
 */
export function freeFolderName(name: string, taken: readonly string[], fallback = 'kind'): string {
  const stem = safeFileStem(name, fallback)
  const used = new Set(taken.map(collisionKey))
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? stem : `${stem}-${n}`
    if (!used.has(collisionKey(candidate))) return candidate
  }
}
