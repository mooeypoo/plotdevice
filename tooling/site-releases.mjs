// The website's download page (Milestone 26) reads apps/site/src/releases.json: every PUBLISHED release,
// newest first, with which file is for which computer. This writes it from GitHub's list of releases.
//
//   node tooling/site-releases.mjs           writes apps/site/src/releases.json
//
// The release-published workflow (site-releases.yml) runs it when a release is published, edited or
// deleted, and commits the file, so Netlify rebuilds the site with the new downloads. It always lists
// every release afresh, so an edited or deleted release corrects itself. Drafts and pre-releases are
// never listed: their files aren't public. GH_TOKEN, when set, is only used to ask GitHub less sparingly.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const API = 'https://api.github.com/repos/mooeypoo/plotdevice/releases'
export const RELEASES_FILE = fileURLToPath(new URL('../apps/site/src/releases.json', import.meta.url))

/** Which file is for which computer, by its name (see apps/desktop/electron-builder.yml). */
export const KINDS = {
  windows: /-setup\.exe$/,
  appimage: /\.AppImage$/,
  deb: /\.deb$/,
  mac: /\.dmg$/,
}

/**
 * GitHub's releases (as `GET /repos/{owner}/{repo}/releases` gives them) → the download page's list:
 * published, not pre-release, newest version first, each with its files by kind. A file that isn't an
 * installer (latest.json, SHA256SUMS) is left out; a release with no installers at all is too.
 */
export function downloadsFrom(releases) {
  return releases
    .filter((release) => !release.draft && !release.prerelease && /^v\d+\.\d+\.\d+$/.test(release.tag_name))
    .map((release) => {
      const files = {}
      for (const [kind, pattern] of Object.entries(KINDS)) {
        const asset = release.assets.find((candidate) => pattern.test(candidate.name))
        if (asset) files[kind] = { name: asset.name, url: asset.browser_download_url, size: asset.size }
      }
      return {
        version: release.tag_name.slice(1),
        date: release.published_at.slice(0, 10),
        notes: release.html_url,
        files,
      }
    })
    .filter((release) => Object.keys(release.files).length > 0)
    .sort((a, b) => compare(b.version, a.version))
}

const compare = (a, b) => {
  const [x, y] = [a, b].map((version) => version.split('.').map(Number))
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]
}

async function fetchReleases() {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'plotdevice-site-releases' }
  if (process.env.GH_TOKEN) headers.Authorization = `Bearer ${process.env.GH_TOKEN}`
  const all = []
  for (let page = 1; ; page++) {
    const response = await fetch(`${API}?per_page=100&page=${page}`, { headers })
    if (!response.ok) throw new Error(`GitHub answered ${response.status} for the list of releases.`)
    const batch = await response.json()
    all.push(...batch)
    if (batch.length < 100) return all
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const text = `${JSON.stringify({ releases: downloadsFrom(await fetchReleases()) }, null, 2)}\n`
  let before = ''
  try {
    before = readFileSync(RELEASES_FILE, 'utf8')
  } catch {
    // No file yet: this is the first list.
  }
  if (text === before) console.log('The download page already lists every release.')
  else {
    writeFileSync(RELEASES_FILE, text)
    console.log(`Wrote ${RELEASES_FILE}.`)
  }
}
