import type { EntryCardProperties } from '../../app/use-entry-card'
import type { MessageKey } from '../../../../i18n/translator'

/** Entry kinds that get cards. */
export type CardKind = 'character' | 'location' | 'note' | 'chapter' | 'part'

/** A field a card can show. */
export type CardFieldId =
  | 'role'
  | 'aliases'
  | 'groups'
  | 'born'
  | 'status'
  | 'pov'
  | 'characters'
  | 'location'
  | 'threads'
  | 'storyDate'
  | 'synopsis'

/** The fields each kind of card can show, in display order. */
export const CARD_FIELDS: Readonly<Record<CardKind, readonly CardFieldId[]>> = {
  character: ['role', 'aliases', 'groups', 'born'],
  location: ['aliases'],
  note: [],
  chapter: ['status', 'pov', 'characters', 'location', 'threads', 'storyDate', 'synopsis'],
  part: ['synopsis']
}

/** What a card shows before the writer chooses (brief Q7). */
export const DEFAULT_CARD_FIELDS: Readonly<Record<CardKind, readonly CardFieldId[]>> = {
  character: ['role', 'aliases', 'groups'],
  location: ['aliases'],
  note: [],
  chapter: ['status', 'pov', 'synopsis'],
  part: ['synopsis']
}

/** Each field's label, shared with the inspector so a field reads the same everywhere. */
export const CARD_FIELD_LABELS: Readonly<Record<CardFieldId, MessageKey>> = {
  role: 'codex-inspector-role',
  aliases: 'codex-inspector-aliases',
  groups: 'codex-inspector-groups',
  born: 'codex-inspector-born',
  status: 'inspector-status',
  pov: 'inspector-pov',
  characters: 'inspector-characters',
  location: 'inspector-location',
  threads: 'inspector-threads',
  storyDate: 'inspector-story-date',
  synopsis: 'inspector-synopsis'
}

/** Whether an entry kind gets a card. */
export function isCardKind(kind: string): kind is CardKind {
  return kind in CARD_FIELDS
}

/** The fields to show for `kind`: the writer's choice, kept to fields that kind has. */
export function chosenFields(kind: CardKind, choice: readonly string[] | undefined): CardFieldId[] {
  const available = CARD_FIELDS[kind]
  return choice === undefined
    ? [...DEFAULT_CARD_FIELDS[kind]]
    : available.filter((field) => choice.includes(field))
}

/** An entry's properties, as either inspector reads them. */
export type CardProperties = EntryCardProperties

/** One shown field: its label and its authored value, ready to display. */
export interface CardFieldValue {
  readonly id: CardFieldId
  readonly label: MessageKey
  readonly value: string
}

/** A wikilink's shown text (`[[Ilka Szabó|Ilka]]` → `Ilka`); anything else unchanged. */
export function linkText(value: string): string {
  const wiki = /^\[\[([^\]|#]*)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]$/u.exec(value.trim())
  if (wiki === null) return value
  return (wiki[2] ?? wiki[1] ?? value).trim()
}

function values(properties: CardProperties, field: CardFieldId): readonly string[] {
  if (properties.kind === 'codex') {
    const codex = properties.value
    switch (field) {
      case 'role':
        return codex.role === undefined ? [] : [codex.role]
      case 'aliases':
        return codex.aliases
      case 'groups':
        return codex.groups ?? []
      case 'born':
        return codex.born === undefined ? [] : [codex.born]
      default:
        return []
    }
  }
  const entry = properties.value
  switch (field) {
    case 'status':
      return entry.status === undefined ? [] : [entry.status]
    case 'pov':
      return entry.pov.map(linkText)
    case 'characters':
      return entry.characters.map(linkText)
    case 'location':
      return entry.location.map(linkText)
    case 'threads':
      return entry.threads
    case 'storyDate':
      return entry.storyDate === undefined ? [] : [entry.storyDate]
    case 'synopsis':
      return entry.synopsis === undefined ? [] : [entry.synopsis]
    default:
      return []
  }
}

/** The chosen fields that have a value, in order; authored values are never changed. */
export function cardFieldValues(
  properties: CardProperties,
  fields: readonly CardFieldId[],
  join: (items: readonly string[]) => string
): CardFieldValue[] {
  return fields.flatMap((id) => {
    const shown = values(properties, id).filter((value) => value.trim() !== '')
    return shown.length === 0 ? [] : [{ id, label: CARD_FIELD_LABELS[id], value: join(shown) }]
  })
}

const HEADING = /^#{1,6}\s/u

/** What a reader sees as characters: a letter with its niqqud or accents counts once. */
function graphemes(text: string): string[] {
  return Array.from(
    new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text),
    (part) => part.segment
  )
}
const SUMMARY_LIMIT = 600

/**
 * The opening of an entry for a card: its first section (up to the next heading) or, without
 * headings, its first paragraphs, cut at a paragraph boundary near 600 characters.
 */
export function firstSection(markdown: string): string {
  const lines = markdown.replace(/\r\n?/gu, '\n').split('\n')
  const start = lines.findIndex((line) => line.trim() !== '')
  if (start < 0) return ''
  const firstIsHeading = HEADING.test(lines[start] ?? '')
  const next = lines.findIndex((line, index) => index > start && HEADING.test(line))
  const section = lines
    .slice(start, next < 0 ? undefined : next)
    .join('\n')
    .trim()
  // A heading alone says little; keep its section's text, which is what the card is for.
  if (firstIsHeading && section.split('\n').length === 1) return section
  const characters = graphemes(section)
  if (characters.length <= SUMMARY_LIMIT) return section
  const cut = section.lastIndexOf('\n\n', SUMMARY_LIMIT)
  return cut > 0 ? section.slice(0, cut) : `${characters.slice(0, SUMMARY_LIMIT).join('')}…`
}
