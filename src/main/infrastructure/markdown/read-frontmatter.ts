import { parseDocument } from 'yaml'
import { splitFrontmatter } from './split-frontmatter'

/** The keys of a file's frontmatter as plain values, or why they couldn't be read. */
export type FrontmatterReading =
  | { readonly kind: 'read'; readonly data: unknown }
  | { readonly kind: 'none' }
  | { readonly kind: 'invalid-encoding' | 'unclosed' }
  | { readonly kind: 'unparseable'; readonly message: string }

/**
 * Reads a file's frontmatter for its values. Read-only: writing goes through the frontmatter
 * document (Phase 2), which keeps comments and formatting.
 */
export function readFrontmatter(bytes: Uint8Array): FrontmatterReading {
  const split = splitFrontmatter(bytes)
  switch (split.kind) {
    case 'invalid-encoding':
    case 'unclosed':
      return { kind: split.kind }
    case 'none':
      return { kind: 'none' }
    case 'frontmatter': {
      // YAML 1.2 core schema (the default): `2187-04-12` stays a string, not a Date.
      const document = parseDocument(split.yaml)
      const firstError = document.errors[0]
      if (firstError !== undefined) return { kind: 'unparseable', message: firstError.message }
      return { kind: 'read', data: document.toJS() as unknown }
    }
  }
}
