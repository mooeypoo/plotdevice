import type { ProjectWarning } from './project-warning'
import { describeFrontmatterValue } from '../../../shared-kernel/frontmatter-values'

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
      warning: { code: 'format-missing' }
    }
  }
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    return {
      version: 1,
      readOnly: false,
      warning: {
        code: 'format-invalid',
        value: describeFrontmatterValue(value)
      }
    }
  }
  if (value > SUPPORTED_FORMAT_VERSION) {
    return {
      version: value,
      readOnly: true,
      warning: {
        code: 'format-newer',
        version: value
      }
    }
  }
  return { version: value, readOnly: false }
}
