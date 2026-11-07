// How manuscripts written in a word processor mark chapters, parts, bylines and scene breaks
// (Milestone 23), in English and Hebrew. A line only counts when the number really is a number, so
// ordinary sentences ("Chapters of my life…", "פרק הזמן הזה…") are never mistaken for headings.

const ENGLISH_UNITS =
  'nineteen|eighteen|seventeen|sixteen|fifteen|fourteen|thirteen|twelve|eleven|ten|nine|eight|seven|six|five|four|three|two|one|zero'
const ENGLISH_TENS = 'twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety'
const ENGLISH_NUMBER = new RegExp(`^(?:(?:${ENGLISH_TENS})(?:[- ](?:${ENGLISH_UNITS}))?|${ENGLISH_UNITS}|hundred)(?![a-z])`, 'i')
const ROMAN = /^(?=[ivxlc])c{0,3}(?:xc|xl|l?x{0,3})(?:ix|iv|v?i{0,3})(?![a-z])/i
const DIGITS = /^\d{1,4}(?!\d)/

const HEBREW_WORDS = [
  // Ordinals, as "פרק שלישי" and "חלק ראשון" (and their feminine forms).
  'ראשונה',
  'ראשון',
  'שנייה',
  'שניה',
  'שני',
  'שלישית',
  'שלישי',
  'רביעית',
  'רביעי',
  'חמישית',
  'חמישי',
  'שישית',
  'שישי',
  'שביעית',
  'שביעי',
  'שמינית',
  'שמיני',
  'תשיעית',
  'תשיעי',
  'עשירית',
  'עשירי',
  'אחרון',
  'אחרונה',
  // Numbers, as "פרק עשרים ואחד".
  'אחד',
  'אחת',
  'שניים',
  'שנים',
  'שתיים',
  'שתים',
  'שלושה',
  'שלוש',
  'ארבעה',
  'ארבע',
  'חמישה',
  'חמש',
  'שישה',
  'שש',
  'שבעה',
  'שבע',
  'שמונה',
  'תשעה',
  'תשע',
  'עשרה',
  'עשר',
  'עשרים',
  'שלושים',
  'ארבעים',
  'חמישים',
  'שישים',
  'שבעים',
  'שמונים',
  'תשעים',
  'מאה',
].join('|')
const HEBREW_END = '(?=\\s|$|[:.\\-–—])'
const HEBREW_NUMBER = new RegExp(`^ו?(?:${HEBREW_WORDS})${HEBREW_END}(?:\\s+ו?(?:${HEBREW_WORDS})${HEBREW_END})*`)
/** Hebrew letters as a number: "ג׳", "י״א", "י\"א". */
const HEBREW_LETTERS = /^(?:[א-ת]{1,3}["״][א-ת]|[א-ת]['׳])(?=\s|$|[:.\-–—])/

const SEPARATED_NAME = /^\s*[:.\-–—]+\s*(.*)$/

/** The length of the number at the start of `text`, or -1 when it doesn't start with one. */
function numberLength(text: string): number {
  for (const pattern of [DIGITS, ROMAN, ENGLISH_NUMBER, HEBREW_NUMBER, HEBREW_LETTERS]) {
    const match = pattern.exec(text)
    if (match && match[0].length > 0) return match[0].length
  }
  return -1
}

/** A word and a number at the start of a line, then nothing, or a separator and a name. */
function numbered(text: string, words: RegExp): { rest: string } | null {
  const [first = '', ...more] = text.trim().split('\n')
  const opening = words.exec(first.trim())
  if (!opening) return null
  const afterWord = first.trim().slice(opening[0].length)
  const length = numberLength(afterWord)
  if (length < 0) return null
  const afterNumber = afterWord.slice(length)
  const following = more
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .join(' ')
  if (afterNumber.trim() === '') return { rest: following }
  const separated = SEPARATED_NAME.exec(afterNumber)
  // "Chapter one was hard" is a sentence: a name needs a separator (":", ".", "—").
  return separated ? { rest: (separated[1] ?? '').trim() || following } : null
}

/**
 * Whether a line starts a chapter: "Chapter 3", "CHAPTER THREE", "Chapter XIV. Frost", "פרק 3: המעבר",
 * "פרק שלישי", "פרק ג׳". `name` is what follows the number (or the next line), without it: Plot Device
 * numbers chapters itself. An empty name means the line is only a number.
 */
export function chapterLine(text: string): { name: string } | null {
  const found = numbered(text, /^(?:chapter|ch\.)\s+|^פרק\s+/i)
  return found ? { name: found.rest } : null
}

/** Whether a line names a part: "Part One: Arrival", "Book Three", "חלק ראשון". The whole line is its name. */
export function partLine(text: string): { name: string } | null {
  return numbered(text, /^(?:part|book)\s+|^חלק\s+/i) ? { name: text.trim().replace(/\s*\n\s*/g, ' ') } : null
}

/** "by Ines Varga", "מאת אינס ורגה": the author's name, on a title page. */
export function authorLine(text: string): string | null {
  const match = /^(?:by|מאת)\s+(.+)$/i.exec(text.trim())
  const name = match?.[1]?.trim()
  return name && name.split(/\s+/).length <= 6 ? name : null
}

/** A line of only `* * *`, `#`, `~`, `⁂` or dashes: a scene break, however the writer typed it. */
export function isSceneBreakText(text: string): boolean {
  return /^(?:[*#~⁂•·=_\-–—]\s*){1,7}$/.test(text.trim())
}
