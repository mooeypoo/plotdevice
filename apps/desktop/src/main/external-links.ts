/**
 * The only pages the app opens, in the person's browser: the author's site, Plot Device's
 * documentation, its GitHub pages (release notes and the issue forms) and the author's Buy Me a
 * Coffee page. Everything else stays refused (see security.ts), including any other link in a
 * release's `latest.json`.
 */
const ALLOWED = [
  { origin: 'https://moriel.tech', path: '/' },
  { origin: 'https://mooeypoo.github.io', path: '/plotdevice/' },
  { origin: 'https://github.com', path: '/mooeypoo/plotdevice/' },
  { origin: 'https://buymeacoffee.com', path: '/mooeypoo/' },
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
