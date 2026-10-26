/**
 * The only pages the app opens, in the person's browser: the author's site and Plot Device's
 * documentation (About and the app menu). Everything else stays refused (see security.ts).
 */
const ALLOWED = [
  { origin: 'https://moriel.tech', path: '/' },
  { origin: 'https://mooeypoo.github.io', path: '/plotdevice/' },
]

export function isAllowedExternalLink(url: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  return ALLOWED.some(({ origin, path }) => parsed.origin === origin && (parsed.pathname + '/').startsWith(path))
}
