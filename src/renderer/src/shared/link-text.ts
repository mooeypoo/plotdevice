/** A wikilink's shown text (`[[Ilka Szabó|Ilka]]` → `Ilka`); anything else unchanged. */
export function linkText(value: string): string {
  const wiki = /^\[\[([^\]|#]*)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]$/u.exec(value.trim())
  if (wiki === null) return value
  return (wiki[2] ?? wiki[1] ?? value).trim()
}
