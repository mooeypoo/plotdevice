import { describe, expect, it } from 'vitest'
import type { ApiError, ErrorDiagnosticDto } from '../../../contract/dtos'
import { createTranslator } from '../../../i18n/translator'
import { formatApiError, formatErrorNotice } from './error-format'

const english = createTranslator('en')
const hebrew = createTranslator('he')

describe('semantic save/recovery error presentation', () => {
  it.each([
    { reason: 'read-only' },
    { reason: 'no-project' },
    { reason: 'invalid-request' },
    { reason: 'manuscript-entry-not-allowed' },
    { reason: 'codex-entry-not-allowed' },
    { reason: 'invalid-recovery-request' },
    { reason: 'snapshot-unavailable' },
    { reason: 'snapshot-invalid' },
    { reason: 'recovery-outside-project' },
    { reason: 'recovery-nested-project' },
    { reason: 'recovery-invalid-destination' },
    { reason: 'recovery-collisions' },
    { reason: 'file-outside-project', path: 'יעל (draft).md' },
    { reason: 'file-missing', path: 'יעל (draft).md' },
    { reason: 'file-unreadable', path: 'יעל (draft).md' },
    { reason: 'file-changed', path: 'יעל (draft).md' },
    { reason: 'file-exists', path: 'יעל (draft).md' },
    {
      reason: 'file-unsafe',
      path: 'יעל (draft).md',
      operation: 'read',
      problem: 'invalid-encoding'
    },
    { reason: 'file-unsafe', path: 'יעל (draft).md', operation: 'read', problem: 'none' },
    { reason: 'file-unsafe', path: 'יעל (draft).md', operation: 'write', problem: 'unclosed' },
    { reason: 'file-unsafe', path: 'יעל (draft).md', operation: 'write', problem: 'unparseable' },
    { reason: 'file-write-failed', path: 'יעל (draft).md', detail: 'ENOSPC (disk full)' },
    { reason: 'file-create-failed', path: 'יעל (draft).md', detail: 'EACCES' },
    { reason: 'recovery-write-failed', detail: 'ENOENT' },
    { reason: 'recovery-create-failed', detail: 'EEXIST' },
    { reason: 'frontmatter-missing' },
    { reason: 'frontmatter-unparseable' },
    { reason: 'frontmatter-not-mapping' },
    { reason: 'frontmatter-unsupported', key: 'type' }
  ] satisfies ErrorDiagnosticDto[])(
    'localizes %j without mutating its parameters',
    (diagnostic) => {
      const error: ApiError = {
        code: 'broad-code',
        message: 'Legacy text must not be parsed',
        diagnostic
      }
      const source = JSON.stringify(error)
      const en = formatApiError(error, english.t)
      const he = formatApiError(error, hebrew.t)
      expect(he).not.toBe(en)
      expect(he).toMatch(/[\u0590-\u05ff]/u)
      expect(he).not.toMatch(/error-|Legacy text|\$\d/u)
      if ('path' in diagnostic && diagnostic.path !== undefined) {
        expect(he).toContain(`\u2068${diagnostic.path}\u2069`)
      }
      if ('detail' in diagnostic && diagnostic.detail !== undefined) {
        expect(he).toContain(`\u2068${diagnostic.detail}\u2069`)
      }
      expect(JSON.stringify(error)).toBe(source)
    }
  )

  it('retains explicit legacy messages instead of guessing from broad error codes', () => {
    const error = { code: 'write-failed', message: 'Custom detail from an unmigrated operation.' }
    expect(formatApiError(error, hebrew.t)).toBe(error.message)
    expect(formatErrorNotice('Legacy UI detail', hebrew.t)).toBe('Legacy UI detail')
    expect(formatErrorNotice(null, hebrew.t)).toBeNull()
    expect(formatErrorNotice({ notice: 'editor-changed-again' }, hebrew.t)).toContain('השתנה שוב')
  })
})
