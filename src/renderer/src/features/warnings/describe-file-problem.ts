import type { FileProblemDto } from '../../../../contract/dtos'
import type { Translator } from '../../../../i18n/translator'
import { isolate } from '../../shared/isolate'

/** A short, plain explanation of why a file can't be fully used. */
export function describeFileProblem(problem: FileProblemDto, t: Translator['t']): string {
  switch (problem.problem) {
    case 'unreadable-file':
      return t('problem-unreadable-file')
    case 'invalid-encoding':
      return t('problem-invalid-encoding')
    case 'unclosed-frontmatter':
      return t('problem-unclosed-frontmatter')
    case 'unparseable-frontmatter':
      return t('problem-unparseable-frontmatter')
    case 'unknown-type':
      return t('problem-unknown-type', isolate(problem.detail ?? ''))
    case 'nested-project':
      return t('problem-nested-project')
    case 'name-breaks-links':
      return t('problem-name-breaks-links')
  }
}
