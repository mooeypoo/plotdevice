import type { ApiError } from '../../../contract/dtos'
import type { MessageKey, Translator } from '../../../i18n/translator'
import { isolate } from './isolate'

export type EditorNoticeKey = Extract<MessageKey, `editor-${string}`>
export type StructureNotice =
  | { readonly notice: 'structure-renumber-failed'; readonly count: number }
  | { readonly notice: 'structure-rename-skipped'; readonly paths: readonly string[] }
export type ErrorNotice =
  | ApiError
  | StructureNotice
  | { readonly notice: EditorNoticeKey }
  | { readonly notice: 'relationships-cannot-edit'; readonly error: ApiError }
  | string
  | null

/** Formats migrated failures semantically; unmigrated operations explicitly retain their message. */
export function formatApiError(error: ApiError, t: Translator['t']): string {
  const diagnostic = error.diagnostic
  if (diagnostic === undefined) return error.message
  switch (diagnostic.reason) {
    case 'read-only':
      return t('error-read-only')
    case 'name-matches':
      return t('error-name-matches')
    case 'part-required':
      return t('error-part-required')
    case 'chapter-missing':
      return t('error-chapter-missing')
    case 'part-missing':
      return t('error-part-missing')
    case 'file-move-failed':
      return t('error-file-move-failed', isolate(diagnostic.path))
    case 'groups-not-editable':
      return t('error-groups-not-editable')
    case 'not-a-character':
      return t('error-not-a-character')
    case 'manuscript-type-unreadable':
      return t('error-manuscript-type-unreadable', isolate(diagnostic.path))
    case 'codex-type-unreadable':
      return t('error-codex-type-unreadable', isolate(diagnostic.path))
    case 'no-project':
      return t('error-no-project')
    case 'invalid-request':
      return t('error-invalid-request')
    case 'manuscript-entry-not-allowed':
      return t('error-manuscript-entry-not-allowed')
    case 'codex-entry-not-allowed':
      return t('error-codex-entry-not-allowed')
    case 'invalid-recovery-request':
      return t('error-invalid-recovery-request')
    case 'snapshot-unavailable':
      return t('error-snapshot-unavailable')
    case 'snapshot-invalid':
      return t('error-snapshot-invalid')
    case 'recovery-outside-project':
      return t('error-recovery-outside-project')
    case 'recovery-nested-project':
      return t('error-recovery-nested-project')
    case 'recovery-invalid-destination':
      return t('error-recovery-invalid-destination')
    case 'recovery-collisions':
      return t('error-recovery-collisions')
    case 'file-outside-project':
      return t('error-file-outside-project', isolate(diagnostic.path))
    case 'file-missing':
      return t('error-file-missing', isolate(diagnostic.path))
    case 'file-unreadable':
      return t('error-file-unreadable', isolate(diagnostic.path))
    case 'file-changed':
      return t('error-file-changed', isolate(diagnostic.path))
    case 'file-exists':
      return t('error-file-exists', isolate(diagnostic.path))
    case 'file-unsafe': {
      const problems = {
        'invalid-encoding': 'error-problem-invalid-encoding',
        unclosed: 'error-problem-unclosed',
        unparseable: 'error-problem-unparseable',
        none: 'error-problem-none'
      } as const
      return t(
        diagnostic.operation === 'read' ? 'error-file-unsafe-read' : 'error-file-unsafe-write',
        isolate(diagnostic.path),
        t(problems[diagnostic.problem])
      )
    }
    case 'file-write-failed':
      return t('error-file-write-failed', isolate(diagnostic.path), isolate(diagnostic.detail))
    case 'file-create-failed':
      return t('error-file-create-failed', isolate(diagnostic.path), isolate(diagnostic.detail))
    case 'recovery-write-failed':
      return t('error-recovery-write-failed', isolate(diagnostic.detail))
    case 'recovery-create-failed':
      return t('error-recovery-create-failed', isolate(diagnostic.detail))
    case 'frontmatter-missing':
      return t('error-frontmatter-missing')
    case 'frontmatter-unparseable':
      return t('error-frontmatter-unparseable')
    case 'frontmatter-not-mapping':
      return t('error-frontmatter-not-mapping')
    case 'frontmatter-unsupported':
      return t('error-frontmatter-unsupported', isolate(diagnostic.key))
  }
}

/** Formats cached semantic notices only when presented, so switching locale never changes state. */
export function formatErrorNotice(source: ErrorNotice, t: Translator['t']): string | null {
  if (source === null || typeof source === 'string') return source
  if ('error' in source) return t(source.notice, formatApiError(source.error, t))
  if ('notice' in source && source.notice === 'structure-renumber-failed')
    return t(source.notice, source.count)
  if ('notice' in source && source.notice === 'structure-rename-skipped')
    return t(source.notice, source.paths.length, source.paths.map(isolate).join(', '))
  return 'notice' in source ? t(source.notice) : formatApiError(source, t)
}
