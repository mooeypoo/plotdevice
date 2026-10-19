/**
 * The form in which file names and link targets are compared: Unicode NFC, then case-folded
 * independently of locale (see "Unicode normalization" in docs/file-format.md).
 */
export function nameComparisonKey(name: string): string {
  return name.normalize('NFC').toLowerCase()
}
