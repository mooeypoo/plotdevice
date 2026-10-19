import writeFileAtomic from 'write-file-atomic'

/**
 * Writes through a temp file and a rename, so a crash never leaves a half-written file
 * (AGENTS.md, "Never damage the user's files"). The existing file's permissions are kept.
 */
export async function writeFileAtomically(
  osPath: string,
  data: string | Uint8Array
): Promise<void> {
  await writeFileAtomic(osPath, typeof data === 'string' ? data : Buffer.from(data), {
    encoding: 'utf8'
  })
}

/** Writes UTF-8 text atomically. */
export async function writeTextFileAtomically(osPath: string, text: string): Promise<void> {
  await writeFileAtomically(osPath, text)
}
