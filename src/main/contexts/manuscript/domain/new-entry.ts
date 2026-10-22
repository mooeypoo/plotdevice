/** The text of a new chapter file: only the keys it needs, and an empty body. */
export function newChapterText(title: string, partLink: string | undefined, order: number): string {
  return [
    '---',
    'type: chapter',
    `title: ${JSON.stringify(title)}`,
    ...(partLink === undefined ? [] : [`part: ${JSON.stringify(partLink)}`]),
    `order: ${String(order)}`,
    '---',
    ''
  ].join('\n')
}

/** The text of a new part file. */
export function newPartText(title: string, order: number): string {
  return [
    '---',
    'type: part',
    `title: ${JSON.stringify(title)}`,
    `order: ${String(order)}`,
    '---',
    ''
  ].join('\n')
}
