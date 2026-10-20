/** First Strong Isolate and Pop Directional Isolate: the plain-text form of `<bdi>`. */
const FSI = '⁨'
const PDI = '⁩'

/**
 * Wraps text from the writer (a name, a title) so its direction can't reorder what's around it,
 * for strings that can't hold `<bdi>`: tooltips, `aria-label`s. "Aunt Bea & יעל: 3" stays in
 * that order, with יעל still read right to left.
 */
export function isolate(text: string): string {
  return `${FSI}${text}${PDI}`
}
