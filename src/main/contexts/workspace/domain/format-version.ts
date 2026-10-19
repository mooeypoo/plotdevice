import type { ProjectWarning } from './project-warning'

/** The newest `format` of novel.md this version of the app can write. */
export const SUPPORTED_FORMAT_VERSION = 1

/** The project's format version, and whether the app may write to it. */
export interface FormatVersionReading {
  readonly version: number
  readonly readOnly: boolean
  readonly warning?: ProjectWarning
}

/** Reads the `format` key of novel.md (see "`novel.md`" in docs/file-format.md). */
export function readFormatVersion(value: unknown): FormatVersionReading {
  if (value === undefined) {
    return {
      version: 1,
      readOnly: false,
      warning: { code: 'format-missing', message: 'novel.md has no "format" key; assuming 1.' }
    }
  }
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    return {
      version: 1,
      readOnly: false,
      warning: {
        code: 'format-invalid',
        message: `"format" should be a whole number, not ${JSON.stringify(value)}; assuming 1.`
      }
    }
  }
  if (value > SUPPORTED_FORMAT_VERSION) {
    return {
      version: value,
      readOnly: true,
      warning: {
        code: 'format-newer',
        message: `This project uses format ${String(value)}, which is newer than this app supports. It is open read-only.`
      }
    }
  }
  return { version: value, readOnly: false }
}
