import { cleanTags, tagKey, type ProjectPath } from '@plotdevice/shared'

/**
 * "Rename everywhere" and "Remove from all pages" (Milestone 12): the pages that have `from`, with
 * their tags afterwards. Renaming to a tag a page already has merges the two there; `to: null`
 * removes it. Pages whose frontmatter can't be read have no known tags, so they are never touched.
 */
export function retaggedPages(
  pages: readonly { file: ProjectPath; tags: readonly string[] }[],
  from: string,
  to: string | null,
): { file: ProjectPath; tags: string[] }[] {
  const key = tagKey(from)
  return pages.flatMap((page) => {
    if (!page.tags.some((tag) => tagKey(tag) === key)) return []
    return [{ file: page.file, tags: cleanTags(page.tags.flatMap((tag) => (tagKey(tag) === key ? (to === null ? [] : [to]) : [tag]))) }]
  })
}
