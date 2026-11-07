const HAS_WORD_CHARACTER = /[\p{L}\p{N}]/u

/**
 * Words in plain prose, counted as word processors count them: runs between spaces that contain a
 * letter or digit. A Hebrew prefix, a maqaf or a hyphen stays inside its word; a dash, an ellipsis
 * or an emoji standing alone isn't a word. The text is prose without Markdown marks.
 */
export function countWords(text: string): number {
  let words = 0
  for (const run of text.split(/\s+/u)) if (HAS_WORD_CHARACTER.test(run)) words++
  return words
}

/**
 * The count as a title page shows it ("about 84,000 words"): exact under 1,000, to the nearest 100
 * under 10,000, and to the nearest 1,000 from there, as manuscripts sent to editors usually give it.
 */
export function roundWordCount(count: number): number {
  if (count < 1_000) return count
  const step = count < 10_000 ? 100 : 1_000
  return Math.round(count / step) * step
}
