import Banana from 'banana-i18n'
import type { UiLocale } from '../contract/dtos'
import en from './en.json'
import he from './he.json'

/** Stable catalog keys, excluding translator metadata. */
export type MessageKey = Exclude<keyof typeof en, '@metadata'>
type ParameterizedMessages = {
  'chrome-binder-tooltip': [shortcut: string]
  'chrome-inspector-tooltip': [shortcut: string]
  'chrome-focus-tooltip': [shortcut: string],
  'chrome-goto-tooltip': [shortcut: string]
  'chrome-leave-focus': [shortcut: string]
  'chrome-count-part': [count: number, formatted: string]
  'chrome-count-chapter': [count: number, formatted: string]
  'chrome-count-character': [count: number, formatted: string]
  'chrome-count-location': [count: number, formatted: string]
  'chrome-count-note': [count: number, formatted: string]
  'chrome-count-template': [count: number, formatted: string]
  'chrome-count-outline': [count: number, formatted: string]
  'chrome-count-words': [count: number, formatted: string]
  'chrome-count-manuscript': [count: number, formatted: string]
  'chrome-count-named-part': [count: number, title: string, formatted: string]
  'project-overview-count-part': [count: number]
  'project-overview-count-chapter': [count: number]
  'project-overview-count-character': [count: number]
  'project-overview-count-location': [count: number]
  'project-overview-count-note': [count: number]
  'project-overview-count-outline': [count: number]
  'project-overview-count-scene': [count: number]
  'project-overview-count-untyped': [count: number]
  'appearance-pixels': [formatted: string]
  'appearance-characters': [formatted: string]
  'editor-link-tooltip': [target: string]
  'editor-embed-tooltip': [target: string]
  'tabs-close-label': [title: string]
  'tabs-return-title': [shortcut: string]
  'entry-place-part': [number: string]
  'entry-place-chapter': [number: string]
  'entry-place-part-chapter': [partNumber: string, chapterNumber: string]
  'entry-place-unsequenced-chapter': [partTitle: string]
  'binder-attention': [count: number, formatted: string]
  'binder-count-words': [count: number, formatted: string]
  'binder-collapse-part': [title: string]
  'binder-expand-part': [title: string]
  'binder-open-part': [title: string]
  'binder-new-chapter-in-part': [title: string]
  'codex-shown-count': [count: number, formatted: string]
  'overview-filtered-count': [
    count: number,
    formattedCount: string,
    total: number,
    formattedTotal: string
  ]
  'overview-synopsis-label': [title: string]
  'codex-raw-type': [type: string]
  'codex-set-type-label': [path: string]
  'codex-also-aliases': [aliases: string]
  'codex-inspector-title-placeholder': [title: string]
  'codex-inspector-appears-empty': [title: string]
  'codex-inspector-remove-item': [item: string]
  'codex-inspector-relationship-with': [number: string]
  'codex-inspector-relationship-remove': [number: string]
  'codex-inspector-relationship-kind': [number: string]
  'codex-inspector-relationship-note': [number: string]
  'codex-inspector-relationship-missing': [name: string]
  'codex-open-editor-label': [title: string]
  'reference-open-label': [title: string]
  'initialize-heading': [folder: string]
  'initialize-description': [marker: string]
  'initialize-inside-description': [folder: string, project: string]
  'initialize-contains-description': [projectPath: string]
  'initialize-open-parent': [project: string]
  'recents-remove-label': [project: string]
  'recents-read-failed': [path: string, detail: string]
  'recents-save-failed': [path: string, detail: string]
  'recents-invalid': [path: string, detail: string]
  'error-workspace-folder-inspection-failed': [path: string, detail: string]
  'error-workspace-folder-search-limit': [path: string, limit: number]
  'error-workspace-folder-dialog-failed': [detail: string]
  'recents-remember-failed': [detail: string]
  'placement-clash': [order: string, titles: string]
  'placement-quoted-title': [title: string]
  'placement-not-in-book': [reason: string]
  'inspector-move-up': [kind: string]
  'inspector-move-down': [kind: string]
  'inspector-title-placeholder': [title: string]
  'inspector-saved-to': [path: string]
  'outline-inspector-while-writing': [shortcut: string]
  'template-inspector-description': [kind: string]
  'inspector-status-not-in-list': [status: string]
  'inspector-add-status': [status: string]
  'inspector-day-count-placeholder': [day: string]
  'link-picker-remove': [label: string]
  'rename-offer-no-links': [name: string]
  'rename-offer-with-links': [
    name: string,
    linkCount: number,
    formattedLinks: string,
    fileCount: number,
    formattedFiles: string
  ]
  'timeline-outside-order': [count: number, formatted: string]
  'timeline-gap-count': [count: number, formatted: string]
  'timeline-gap-input-label': [formatted: string]
  'timeline-cell-label': [row: string, chapter: string, state: string]
  'interactions-outside-order': [count: number, formatted: string]
  'interactions-cell-self': [name: string, count: number, formatted: string]
  'interactions-cell-pair': [
    row: string,
    column: string,
    count: number,
    formatted: string
  ]
  'interactions-selected-self': [name: string, count: number, formatted: string]
  'interactions-selected-pair': [
    row: string,
    column: string,
    count: number,
    formatted: string
  ]
  'interactions-never-together': [row: string, column: string]
  'interactions-pov': [name: string]
  'link-wiki-unresolved': [target: string]
  'link-markdown-unresolved': [address: string]
  'link-target-unsupported': [path: string]
  'reference-not-listed': [path: string]
  'error-workspace-folder-missing': [path: string]
  'error-workspace-not-project': [path: string]
  'error-workspace-already-project': [path: string]
  'error-workspace-inside-project': [path: string]
  'error-workspace-contains-project': [path: string]
  'error-link-needs-no-folder': [name: string]
  'error-key-needs-no-quotes': [key: string]
  'error-file-move-failed': [path: string]
  'structure-renumber-failed': [count: number]
  'structure-rename-skipped': [count: number, paths: string]
  'error-manuscript-type-unreadable': [path: string]
  'error-codex-type-unreadable': [path: string]
  'relationships-cannot-edit': [detail: string]
  'recovery-missing-description': [kind: string]
  'error-file-outside-project': [path: string]
  'error-file-missing': [path: string]
  'error-file-unreadable': [path: string]
  'error-file-changed': [path: string]
  'error-file-exists': [path: string]
  'error-file-unsafe-read': [path: string, problem: string]
  'error-file-unsafe-write': [path: string, problem: string]
  'error-file-write-failed': [path: string, detail: string]
  'error-file-create-failed': [path: string, detail: string]
  'error-recovery-write-failed': [detail: string]
  'error-recovery-create-failed': [detail: string]
  'error-frontmatter-unsupported': [key: string]
  'about-detail': [version: string]
  'date-year-bce': [year: string]
  'date-day-count': [day: string]
  'date-month-year': [month: string, year: string]
  'date-full': [day: string, month: string, year: string]
  'date-range': [from: string, to: string]
  'date-error-not-day-number': [value: string]
  'date-error-too-large': [value: string]
  'date-error-not-date': [value: string]
  'date-error-invalid-month': [value: string, month: string]
  'date-error-invalid-day': [value: string]
  'warnings-open': [path: string]
  'warnings-means': [target: string]
  'problem-unknown-type': [type: string]
  'warning-format-invalid': [value: string]
  'warning-format-newer': [version: string]
  'warning-setting-file-name-sync': [key: string, value: string]
  'warning-setting-boolean': [key: string, value: string]
  'warning-setting-folder-mapping': [key: string, value: string]
  'warning-setting-visible-folder': [key: string, value: string]
  'warning-duplicate-chapter-order': [order: string, titles: string]
  'warning-duplicate-part-order': [order: string, titles: string]
  'warning-part-without-order': [titles: string]
  'warning-ambiguous-body': [title: string, link: string, choices: string, example: string]
  'warning-ambiguous-key': [
    title: string,
    link: string,
    key: string,
    choices: string,
    example: string
  ]
  'warning-unquoted-link': [title: string, source: string, example: string]
  'warning-not-link': [title: string, key: string, value: string]
  'warning-not-integer': [title: string, key: string, value: string]
  'warning-list': [list: string, next: string]
  'warning-alternatives': [list: string, next: string]
  'warning-quoted-title': [title: string]
  'workbench-panel-label': [viewTitle: string]
  'workbench-resize-panel': [viewTitle: string]
  'workbench-section-collapse': [viewTitle: string]
  'workbench-section-expand': [viewTitle: string]
  'workbench-panel-options': [viewTitle: string]
  'workbench-section-close': [viewTitle: string]
  'workbench-add-view': [viewTitle: string]
  'workbench-show-view': [viewTitle: string]
  'workbench-layout-delete-confirm': [name: string]
  'workbench-layout-name-taken': [name: string]
  'cards-pin-label': [title: string]
  'cards-unpin-label': [title: string]
  'cards-collapse': [title: string]
  'cards-expand': [title: string]
  'cards-options': [title: string]
  'cards-field-show': [field: string]
  'cards-field-hide': [field: string]
  'cards-peek-label': [title: string]
  'cast-chip-pov': [title: string]
  'cast-chip-mentioned': [title: string]
  'split-open-beside-label': [title: string]
  'split-region': [title: string]
  'palette-count': [count: number, formatted: string]
  'palette-beside-hint': [shortcut: string]
  'palette-use-layout': [name: string]
  'warning-language-invalid': [value: string]
  'warning-setting-vocabulary': [key: string, value: string]
  'book-language-other': [tag: string]
  'board-pov': [names: string]
  'board-words': [count: number, formatted: string]
  'capture-into': [outline: string]
  'board-move-to': [column: string]
  'board-moved-beat': [beat: string, column: string]
  'board-moved-column': [column: string]
  'board-add-card-label': [column: string]
  'board-synopsis-label': [chapter: string]
  'board-status-label': [chapter: string]
  'board-added': [beat: string, column: string]
  'board-renamed': [title: string]
  'board-synopsis-saved': [chapter: string]
  'board-status-set': [chapter: string, status: string]
}
type MessageArguments<Key extends MessageKey> = Key extends keyof ParameterizedMessages
  ? ParameterizedMessages[Key]
  : []

/** Typed, escaped-text presentation messages. Callers isolate dynamic user content. */
export interface Translator {
  readonly t: <Key extends MessageKey>(key: Key, ...parameters: MessageArguments<Key>) => string
  readonly setLocale: (locale: UiLocale) => void
}

/** Creates an isolated offline formatter, shared by main and renderer presentation. */
export function createTranslator(locale: UiLocale): Translator {
  const banana = new Banana(locale, { finalFallback: 'en', wikilinks: false })
  banana.load(en, 'en')
  banana.load(he, 'he')
  return {
    t: (key, ...parameters) => banana.i18n(key, ...parameters),
    setLocale: (next) => {
      banana.setLocale(next)
    }
  }
}
