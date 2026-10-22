import { DEFAULT_PROJECT_SETTINGS } from './project-settings'

/**
 * The words a new novel.md is written with, in the book's language (ADR 0019). Keys and values the
 * app reads stay canonical; only statuses, the example thread's name and the comments change.
 */
export interface NovelTemplateWords {
  /** The book's language tag, written as `language`. */
  readonly language: string
  readonly statuses: readonly string[]
  readonly comments: {
    readonly defaults: string
    readonly language: string
    readonly calendar: string
    readonly threads: string
    readonly threadName: string
    readonly fileNames: string
    readonly orderPrefix: string
    readonly folders: string
    readonly template: string
  }
}

/**
 * The novel.md that "initialize project" writes: every key with its default and a short comment,
 * so a writer editing it in another tool can see the options.
 */
export function novelTemplate(title: string, words: NovelTemplateWords): string {
  const { fileNames, orderPrefix, folders } = DEFAULT_PROJECT_SETTINGS
  const { comments } = words
  // A JSON string is a valid YAML double-quoted scalar, so any title (colons, quotes, Hebrew) is safe.
  const quotedTitle = JSON.stringify(title)
  const lines = [
    '---',
    `# ${comments.defaults}`,
    'format: 1',
    `title: ${quotedTitle}`,
    'author: ""',
    withComment(`language: ${words.language}`, comments.language),
    withComment('calendar: gregorian', comments.calendar),
    `statuses: [${words.statuses.map(flowItem).join(', ')}]`,
    withComment('threads: []', comments.threads),
    '#  - key: main',
    `#    name: ${comments.threadName}`,
    '#    color: "#4f7cac"',
    'settings:',
    withComment(`  file_names: ${fileNames}`, comments.fileNames),
    withComment(`  order_prefix: ${String(orderPrefix)}`, comments.orderPrefix),
    withComment('  folders:', comments.folders),
    `    part: ${folders.part}`,
    `    chapter: ${folders.chapter}`,
    `    character: ${folders.character}`,
    `    location: ${folders.location}`,
    `    note: ${folders.note}`,
    withComment(`    template: ${folders.template}`, comments.template),
    '---'
  ]
  return `${lines.join('\n')}\n`
}

const COMMENT_COLUMN = 31

function withComment(line: string, comment: string): string {
  return `${line.padEnd(COMMENT_COLUMN)}# ${comment}`
}

/** Plain scalars YAML would read as something other than text. */
const NOT_TEXT = /^(?:(?:true|false|yes|no|on|off|null|~)$|[-+]?\.?\d)/iu

/** A flow-list item: plain when YAML reads it back as the same text, quoted otherwise. */
function flowItem(value: string): string {
  const plain =
    /^[\p{L}\p{N}][\p{L}\p{N}\p{M} '_-]*$/u.test(value) &&
    value.trim() === value &&
    !NOT_TEXT.test(value)
  return plain ? value : JSON.stringify(value)
}
