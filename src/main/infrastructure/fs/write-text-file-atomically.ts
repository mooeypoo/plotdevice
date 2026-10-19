import writeFileAtomic from 'write-file-atomic'

/**
 * Writes UTF-8 text through a temp file and a rename, so a crash never leaves a half-written file
 * (AGENTS.md, "Never damage the user's files").
 */
export async function writeTextFileAtomically(osPath: string, text: string): Promise<void> {
  await writeFileAtomic(osPath, text, { encoding: 'utf8' })
}
