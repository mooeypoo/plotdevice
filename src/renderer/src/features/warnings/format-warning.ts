import type { ManuscriptWarningDto, WarningDto } from '../../../../contract/dtos'
import type { Translator } from '../../../../i18n/translator'
import { isolate } from '../../shared/isolate'

/** Localizes a semantic project warning without altering metadata or access decisions. */
export function formatProjectWarning(warning: WarningDto, t: Translator['t']): string {
  switch (warning.code) {
    case 'novel-file-unreadable':
      switch (warning.problem) {
        case 'unreadable-file':
          return t('warning-novel-unreadable-file')
        case 'invalid-encoding':
          return t('warning-novel-invalid-encoding')
        case 'unclosed-frontmatter':
          return t('warning-novel-unclosed-frontmatter')
        case 'unparseable-frontmatter':
          return t('warning-novel-unparseable-frontmatter')
      }
      break
    case 'format-missing':
      return t('warning-format-missing')
    case 'format-invalid':
      return t('warning-format-invalid', isolate(warning.value))
    case 'format-newer':
      return t('warning-format-newer', String(warning.version))
    case 'title-invalid':
      return t('warning-title-invalid')
    case 'author-invalid':
      return t('warning-author-invalid')
    case 'settings-invalid':
      return t('warning-settings-invalid')
    case 'setting-invalid': {
      const key = isolate(`settings.${warning.key}`)
      const value = isolate(warning.value)
      switch (warning.expected) {
        case 'file-name-sync':
          return t('warning-setting-file-name-sync', key, value)
        case 'boolean':
          return t('warning-setting-boolean', key, value)
        case 'folder-mapping':
          return t('warning-setting-folder-mapping', key, value)
        case 'visible-folder':
          return t('warning-setting-visible-folder', key, value)
      }
    }
  }
}

function join(
  values: readonly string[],
  key: 'warning-list' | 'warning-alternatives',
  t: Translator['t']
): string {
  return values.reduce((list, value, index) => (index === 0 ? value : t(key, list, value)), '')
}

/** Localizes manuscript warnings, retaining every candidate and technical correction example. */
export function formatManuscriptWarning(warning: ManuscriptWarningDto, t: Translator['t']): string {
  switch (warning.code) {
    case 'duplicate-chapter-order':
    case 'duplicate-part-order':
    case 'part-without-order': {
      const titles = join(
        warning.titles.map((title) => t('warning-quoted-title', isolate(title))),
        'warning-list',
        t
      )
      return warning.code === 'part-without-order'
        ? t('warning-part-without-order', titles)
        : t(
            warning.code === 'duplicate-chapter-order'
              ? 'warning-duplicate-chapter-order'
              : 'warning-duplicate-part-order',
            String(warning.order),
            titles
          )
    }
    case 'ambiguous-link': {
      const first = warning.choices[0]
      if (first === undefined) throw new Error('Ambiguous warning must have candidate paths')
      const title = isolate(warning.title)
      const link = isolate(warning.link)
      const choices = join(warning.choices.map(isolate), 'warning-alternatives', t)
      const example = isolate(`[[${first.replace(/\.md$/iu, '')}]]`)
      return warning.location.kind === 'body'
        ? t('warning-ambiguous-body', title, link, choices, example)
        : t('warning-ambiguous-key', title, link, isolate(warning.location.key), choices, example)
    }
    case 'unusable-value':
      switch (warning.reason) {
        case 'unquoted-link':
          return t(
            'warning-unquoted-link',
            isolate(warning.title),
            isolate(`${warning.key}: ${warning.value}`),
            isolate(`${warning.key}: "${warning.value}"`)
          )
        case 'not-link':
          return t(
            'warning-not-link',
            isolate(warning.title),
            isolate(warning.key),
            isolate(warning.value)
          )
        case 'not-integer':
          return t(
            'warning-not-integer',
            isolate(warning.title),
            isolate(warning.key),
            isolate(warning.value)
          )
      }
  }
}
