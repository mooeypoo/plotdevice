import { z } from 'zod'

const https = z.url({ protocol: /^https$/ })
export const releaseVersionSchema = z.string().regex(/^\d+\.\d+\.\d+$/)

/**
 * `latest.json`, attached to every release (Milestone 15; written by tooling/changelog.mjs). Fields
 * may be added later; a reader ignores what it doesn't know. A new `format` means a reader can't
 * understand the file, and it stays quiet.
 */
export const latestReleaseSchema = z.object({
  format: z.literal(1),
  version: releaseVersionSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** The release notes. */
  notes: https,
  /** The install page, by interface language; English is always there. */
  download: z.object({ en: https }).catchall(https),
})

export type LatestRelease = z.infer<typeof latestReleaseSchema>

/** A newer version, as the page shows it. */
export interface UpdateView {
  version: string
  notes: string
  download: Record<string, string>
}

/** "Check for updates", asked by the author. */
export type UpdateCheckView = { kind: 'newer'; update: UpdateView } | { kind: 'newest' } | { kind: 'failed' }

export const dismissUpdateSchema = z.strictObject({ version: releaseVersionSchema })
