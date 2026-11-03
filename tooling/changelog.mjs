// The changelog and release notes (Milestone 15), built from commit messages: `feat:`, `fix:` and
// `perf:` commits are what authors notice, so they become the release notes; everything else
// (docs, tests, CI) is left out. A person adds a short summary to each version before it's tagged.

/** Commit prefixes in use. Every commit in a pull request needs one, so nothing falls out of the changelog by accident. */
export const PREFIXES = ['feat', 'fix', 'perf', 'docs', 'test', 'ci', 'build', 'style', 'dev', 'refactor', 'chore', 'release']

/** The prefixes authors see, in the order their groups appear. */
export const GROUPS = [
  { prefix: 'feat', heading: 'New' },
  { prefix: 'fix', heading: 'Fixed' },
  { prefix: 'perf', heading: 'Faster' },
]

/** Stands where the summary goes until someone writes it; tagging refuses a version that still has it. */
export const SUMMARY_PLACEHOLDER = '<!-- Summary: two or three sentences for authors, about what this version means for their writing. -->'

export const CHANGELOG_HEADER = `# What's new in Plot Device

Each version starts with a short summary, then what's new, what's fixed and what's faster.
`

const COMMIT = /^(?<type>[a-z]+)(?:\((?<scope>[^)]*)\))?(?<breaking>!)?: (?<description>\S.*)$/

/** A commit subject's parts, or `null` when it has no `type:` prefix. */
export function parseCommit(subject) {
  const match = COMMIT.exec(subject.trim())
  return match ? { type: match.groups.type, description: match.groups.description.trim() } : null
}

/** Subjects without a known prefix. Merge commits are left out before this is called (`git log --no-merges`). */
export function commitsWithoutPrefix(subjects) {
  return subjects.filter((subject) => !PREFIXES.includes(parseCommit(subject)?.type))
}

const capitalised = (text) => text.replace(/^\p{Ll}/u, (letter) => letter.toUpperCase())

/** Starts the line linking to every commit in a version, for developers. Left out of the Linux metadata. */
export const ALL_CHANGES = 'All changes, for developers:'

/**
 * A version's section: heading, summary placeholder, then one group per kind of change, then a link to
 * every commit since the tag `since` (none for the first release). `subjects` are oldest first; a line
 * repeated by several commits appears once.
 */
export function changelogSection({ version, date, subjects, since = null }) {
  const groups = GROUPS.map(({ prefix, heading }) => {
    const lines = [
      ...new Set(
        subjects
          .map(parseCommit)
          .filter((commit) => commit?.type === prefix)
          .map((commit) => `- ${capitalised(commit.description)}`),
      ),
    ]
    return lines.length ? `### ${heading}\n\n${lines.join('\n')}\n` : null
  }).filter(Boolean)
  const all = since ? [`${ALL_CHANGES} [${since}…v${version}](${REPOSITORY}/compare/${since}...v${version})\n`] : []
  return [`## ${version} — ${date}\n`, `${SUMMARY_PLACEHOLDER}\n`, ...groups, ...all].join('\n')
}

/** The changelog with a new section at the top, under the header. A missing changelog starts from the header. */
export function insertSection(changelog, section) {
  const text = changelog?.trim() ? changelog : CHANGELOG_HEADER
  const first = text.search(/^## /m)
  return first === -1 ? `${text.trimEnd()}\n\n${section}` : `${text.slice(0, first)}${section}\n${text.slice(first)}`
}

/** A version's section without its heading, or `null` when the changelog has none. */
export function sectionFor(changelog, version) {
  const lines = changelog.split(/\r?\n/)
  const start = lines.findIndex((line) => line.startsWith(`## ${version} `) || line === `## ${version}`)
  if (start === -1) return null
  const end = lines.findIndex((line, index) => index > start && line.startsWith('## '))
  return lines
    .slice(start + 1, end === -1 ? undefined : end)
    .join('\n')
    .trim()
}

/** The date in a version's heading (`## 0.3.0 — 2026-11-05`), or `null`. */
export function dateFor(changelog, version) {
  const heading = changelog.split(/\r?\n/).find((line) => line.startsWith(`## ${version} `))
  return /\d{4}-\d{2}-\d{2}/.exec(heading ?? '')?.[0] ?? null
}

/** What stops a version's notes from being published, or an empty list when they're ready. */
export function notesProblems(changelog, version) {
  const section = sectionFor(changelog, version)
  if (section === null) return [`CHANGELOG.md has no section for ${version}.`]
  const problems = []
  // Any comment, not just the placeholder: a half-edited one would reach the release page and the Linux metadata.
  if (section.includes(SUMMARY_PLACEHOLDER)) problems.push(`The summary for ${version} is still the placeholder: write it in CHANGELOG.md.`)
  else if (/<!--|-->/.test(section)) problems.push(`The notes for ${version} still have a <!-- comment -->: remove it from CHANGELOG.md.`)
  else if (!section.split(/^### /m)[0]?.trim())
    problems.push(`The notes for ${version} have no summary: write two or three sentences above the first ###.`)
  if (!dateFor(changelog, version)) problems.push(`The heading for ${version} has no date (## ${version} — YYYY-MM-DD).`)
  return problems
}

const VERSION = /^(\d+)\.(\d+)\.(\d+)$/

/** A plain `x.y.z` version as numbers, or `null`. The app compares versions the same way (application/updates). */
export function parseVersion(text) {
  const match = VERSION.exec(text)
  return match ? match.slice(1).map(Number) : null
}

/** Negative, zero or positive, like a sort comparator. Both must be plain `x.y.z` versions. */
export function compareVersions(a, b) {
  const [left, right] = [parseVersion(a), parseVersion(b)]
  if (!left || !right) throw new Error(`Not a plain x.y.z version: ${left ? b : a}`)
  return left[0] - right[0] || left[1] - right[1] || left[2] - right[2]
}

export const REPOSITORY = 'https://github.com/mooeypoo/plotdevice'
const DOCUMENTATION = 'https://mooeypoo.github.io/plotdevice/'

/**
 * `latest.json`, attached to every release. The app asks for it at
 * `${REPOSITORY}/releases/latest/download/latest.json`, which GitHub sends to the newest published
 * release, so it changes the moment a release is published. Links live here, not in the app, so the
 * documentation can move without breaking copies already installed.
 */
export function latestJson({ version, date }) {
  return {
    format: 1,
    version,
    date,
    notes: `${REPOSITORY}/releases/tag/v${version}`,
    download: { en: `${DOCUMENTATION}start/install/`, he: `${DOCUMENTATION}he/start/install/` },
  }
}

const escapeXml = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
/** Markdown links and emphasis as plain text, for AppStream, which allows no markup in its paragraphs. */
const plain = (text) =>
  escapeXml(
    text
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/[*_`]/g, '')
      .trim(),
  )

/**
 * A version's notes as an AppStream `<description>`, for "What's new" in Linux software centres:
 * the summary as a paragraph, then each group as a paragraph and a list.
 */
export function appstreamDescription(section) {
  const parts = []
  for (const block of section.split(/\n{2,}/)) {
    const lines = block.split('\n').filter((line) => line.trim() && !line.startsWith('<!--'))
    if (!lines.length || lines[0].startsWith(ALL_CHANGES)) continue
    if (lines.every((line) => line.startsWith('- ')))
      parts.push(`<ul>${lines.map((line) => `<li>${plain(line.slice(2))}</li>`).join('')}</ul>`)
    else if (lines[0].startsWith('### ')) parts.push(`<p>${plain(lines[0].slice(4))}</p>`)
    else parts.push(`<p>${plain(lines.join(' '))}</p>`)
  }
  return `<description>${parts.join('')}</description>`
}

/**
 * The metainfo file with this version's `<release>` entry (added if missing) carrying its date and
 * description. Other versions' entries are left as they are.
 */
export function withAppstreamRelease(metainfo, { version, date, description }) {
  const entry = description
    ? `<release version="${version}" date="${date}">${description}</release>`
    : `<release version="${version}" date="${date}"/>`
  const existing = new RegExp(`<release version="${version.replace(/\./g, '\\.')}"[^>]*?(?:/>|>[\\s\\S]*?</release>)`)
  if (existing.test(metainfo)) return metainfo.replace(existing, entry)
  return metainfo.replace(/<releases>(\s*)/, (_all, space) => `<releases>${space}${entry}${space}`)
}
