/** Reads the chronology keys of the open project's novel.md. */
export interface ChronologyRepository {
  /** novel.md's frontmatter values, or `undefined` if it can't be read. */
  readNovelFrontmatter(): Promise<unknown>
}
