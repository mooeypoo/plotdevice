import { domainError, type DomainError } from './domain-error'
import { err, ok, type Result } from './result'

declare const fileNameBrand: unique symbol

/**
 * A single file or folder name the app may write: valid on Linux and Windows, safe inside a
 * wikilink, and in Unicode NFC (see "Titles and file names" in docs/file-format.md).
 */
export type FileName = string & { readonly [fileNameBrand]: true }

/** Why a name was rejected by `parseFileName`. */
export type FileNameErrorCode =
  | 'empty'
  | 'dot-name'
  | 'forbidden-character'
  | 'link-breaking-character'
  | 'trailing-dot-or-space'
  | 'reserved-name'
  | 'too-long'

/** The most UTF-8 bytes a name may take: Linux allows 255 bytes, Windows 255 UTF-16 units. */
const MAX_NAME_BYTES = 255
const MAX_TITLE_CHARACTERS = 100
const DEFAULT_EXTENSION = '.md'

const FORBIDDEN_CHARACTER = /[<>:"/\\|?*\u0000-\u001F]/u
const LINK_BREAKING_CHARACTER = /[#^[\]]/u
const RESERVED_STEM = /^(CON|PRN|AUX|NUL|COM[1-9¹²³]|LPT[1-9¹²³])$/iu

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

/** Checks a name the writer typed (or the app built) and returns it in NFC form. */
export function parseFileName(raw: string): Result<FileName, DomainError<FileNameErrorCode>> {
  const name = raw.normalize('NFC')

  if (name === '') return err(domainError('empty', 'A name cannot be empty.'))
  if (name === '.' || name === '..') {
    return err(domainError('dot-name', `"${name}" is not a usable name.`))
  }
  if (FORBIDDEN_CHARACTER.test(name)) {
    return err(
      domainError(
        'forbidden-character',
        'Names cannot contain < > : " / \\ | ? * or control characters.'
      )
    )
  }
  if (LINK_BREAKING_CHARACTER.test(name)) {
    return err(
      domainError('link-breaking-character', 'Names cannot contain # ^ [ ], which break links.')
    )
  }
  if (name.endsWith('.') || name.endsWith(' ')) {
    return err(
      domainError('trailing-dot-or-space', 'Names cannot end with a dot or a space on Windows.')
    )
  }
  if (isReservedOnWindows(name)) {
    return err(domainError('reserved-name', `"${name}" is a reserved name on Windows.`))
  }
  if (utf8ByteLength(name) > MAX_NAME_BYTES) {
    return err(domainError('too-long', 'This name is too long for Linux and Windows.'))
  }
  return ok(name as FileName)
}

/**
 * Builds the file name the app uses for a new entry with this title. Always succeeds; uniqueness
 * within the project is the caller's job.
 */
export function fileNameFromTitle(title: string, extension: string = DEFAULT_EXTENSION): FileName {
  const cleaned = trimSpacesAndDots(
    title
      .normalize('NFC')
      .replaceAll(':', ' -')
      .replace(/[/\\|]/gu, '-')
      // Before removing control characters, so tabs and newlines become spaces.
      .replace(/\s+/gu, ' ')
      .replace(/[<>"?*#^[\]\u0000-\u001F]/gu, '')
  )

  let stem = trimSpacesAndDots(truncate(cleaned, MAX_NAME_BYTES - utf8ByteLength(extension)))
  if (stem === '') stem = 'Untitled'
  if (RESERVED_STEM.test(stem)) stem = `${stem}_`

  const result = parseFileName(`${stem}${extension}`)
  if (!result.ok) {
    throw new Error(`fileNameFromTitle produced an invalid name: ${result.error.code}`)
  }
  return result.value
}

function isReservedOnWindows(name: string): boolean {
  const stem = name.split('.')[0] ?? ''
  return RESERVED_STEM.test(stem.trimEnd())
}

function trimSpacesAndDots(text: string): string {
  return text.replace(/^[\s.]+|[\s.]+$/gu, '')
}

/** Keeps whole characters (letters with their combining marks) within both length limits. */
function truncate(text: string, maxBytes: number): string {
  let kept = ''
  let count = 0
  let bytes = 0
  for (const { segment } of graphemes.segment(text)) {
    const segmentBytes = utf8ByteLength(segment)
    if (count === MAX_TITLE_CHARACTERS || bytes + segmentBytes > maxBytes) break
    kept += segment
    count += 1
    bytes += segmentBytes
  }
  return kept
}

function utf8ByteLength(text: string): number {
  let bytes = 0
  for (const character of text) {
    const codePoint = character.codePointAt(0) ?? 0
    if (codePoint < 0x80) bytes += 1
    else if (codePoint < 0x800) bytes += 2
    else if (codePoint < 0x10000) bytes += 3
    else bytes += 4
  }
  return bytes
}
