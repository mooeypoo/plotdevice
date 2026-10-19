const words = new Intl.Segmenter(undefined, { granularity: 'word' })

const OBSIDIAN_COMMENT = /%%[\s\S]*?%%/gu
const HTML_COMMENT = /<!--[\s\S]*?-->/gu
const EMBED = /!\[\[[^\]]*\]\]/gu
const WIKILINK = /\[\[([^\]|]*)(?:\|([^\]]*))?\]\]/gu
const MARKDOWN_LINK = /\[([^\]]*)\]\([^)]*\)/gu
const HYPHEN_BETWEEN_LETTERS = /(\p{L})[-‐‑](?=\p{L})/gu

/**
 * Counts the words of prose the way a writer expects (see "Word counts" in docs/file-format.md):
 * Unicode word segmentation, so Hebrew and other scripts count correctly; comments and embeds are
 * left out; links count their visible text; a hyphenated word counts once.
 */
export function countWords(body: string): number {
  const prose = body
    .replace(OBSIDIAN_COMMENT, ' ')
    .replace(HTML_COMMENT, ' ')
    .replace(EMBED, ' ')
    .replace(
      WIKILINK,
      (_, target: string, shownText: string | undefined) => shownText ?? target.split('#')[0] ?? ''
    )
    .replace(MARKDOWN_LINK, '$1')
    .replace(HYPHEN_BETWEEN_LETTERS, '$1')

  let count = 0
  for (const segment of words.segment(prose)) {
    if (segment.isWordLike === true) count += 1
  }
  return count
}
