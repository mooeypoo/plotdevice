import { DEFAULT_PROJECT_SETTINGS } from './project-settings'

/**
 * The novel.md that "initialize project" writes: every key with its default and a short comment,
 * so a writer editing it in another tool can see the options.
 */
export function novelTemplate(title: string): string {
  const { fileNames, orderPrefix, folders } = DEFAULT_PROJECT_SETTINGS
  // A JSON string is a valid YAML double-quoted scalar, so any title (colons, quotes, Hebrew) is safe.
  const quotedTitle = JSON.stringify(title)
  const lines = [
    '---',
    '# Plot Device project. Every key is optional; these are the defaults.',
    'format: 1',
    `title: ${quotedTitle}`,
    'author: ""',
    withComment(
      'calendar: gregorian',
      'gregorian (dates like 1952-10-03) or day-count (day 14 of the story)'
    ),
    'statuses: [idea, outline, draft, revised, final]',
    withComment('threads: []', 'plotlines, for example:'),
    '#  - key: main',
    '#    name: Main plot',
    '#    color: "#4f7cac"',
    'settings:',
    withComment(
      `  file_names: ${fileNames}`,
      'when a title changes, rename its file: ask, always, or never'
    ),
    withComment(
      `  order_prefix: ${String(orderPrefix)}`,
      'true: start new chapter file names with their order number'
    ),
    withComment('  folders:', 'where new files go, relative to this folder'),
    `    part: ${folders.part}`,
    `    chapter: ${folders.chapter}`,
    `    character: ${folders.character}`,
    `    location: ${folders.location}`,
    `    note: ${folders.note}`,
    '---'
  ]
  return `${lines.join('\n')}\n`
}

const COMMENT_COLUMN = 31

function withComment(line: string, comment: string): string {
  return `${line.padEnd(COMMENT_COLUMN)}# ${comment}`
}
