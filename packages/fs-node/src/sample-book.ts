import { cp, rm, stat } from 'node:fs/promises'

/**
 * The sample book to try (Milestone 20): a copy of the bundled sample, kept in the app's own data, so it
 * can be changed and broken without touching anything of the author's. `fresh` replaces the copy with
 * the original ("Start the sample over"); otherwise an existing copy is kept as the author left it.
 * Returns the copy's folder.
 */
export async function prepareSampleBook(source: string, copy: string, fresh = false): Promise<string> {
  const exists = await stat(copy).then(
    () => true,
    () => false,
  )
  if (exists && !fresh) return copy
  if (exists) await rm(copy, { recursive: true, force: true })
  await cp(source, copy, { recursive: true, errorOnExist: true, force: false })
  return copy
}
