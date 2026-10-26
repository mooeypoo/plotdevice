/**
 * The names a page's relationships section goes by (ADR 0009), by language. Any of them is recognised
 * on any page. Shared because both the host (reading and writing pages) and the page editor (folding
 * the section) need the same list.
 */
export const RELATIONSHIP_HEADINGS: Readonly<Record<string, string>> = { en: 'Relationships', he: 'קשרים' }
