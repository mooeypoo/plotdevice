// Prepares a release (Milestone 15): `pnpm release 0.4.0`, or `pnpm release 0.4.0 --dry-run` to see the
// notes without changing anything. It checks that main is ready, sets the version, writes the
// changelog from the commits since the last release, and opens a pull request. Write the summary and
// edit the notes in that pull request; merging it tags the release, and CI builds a draft.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { changelogSection, compareVersions, insertSection, parseVersion, withAppstreamRelease } from './changelog.mjs'

const repository = join(import.meta.dirname, '..')
const PACKAGE = join(repository, 'apps/desktop/package.json')
const METAINFO = join(repository, 'apps/desktop/build/tech.moriel.plotdevice.metainfo.xml')
const CHANGELOG = join(repository, 'CHANGELOG.md')
/** The repository also holds the old app's history; this new implementation starts here (2026-10-25). */
const FIRST_COMMIT = '133ae0a466200915bd05adc64277ab5524d2af3b'

/**
 * Everything that stops a release, in plain words; an empty list means it can go ahead.
 * `facts` are gathered from git and GitHub by `gatherFacts`, so the rules can be tested without them.
 */
export function releaseProblems(facts) {
  const { version, branch, uncommitted, upToDate, lastTag, packageVersion, ci, changes } = facts
  const problems = []
  if (!parseVersion(version ?? '')) return [`Give a plain version number, such as 0.4.0 (got ${version ?? 'nothing'}).`]
  if (branch !== 'main') problems.push(`Release from main (you're on ${branch}).`)
  if (uncommitted) problems.push('Commit or stash your changes first: the working tree has uncommitted changes.')
  if (!upToDate) problems.push('Main differs from GitHub: pull or push first.')
  const tagged = lastTag?.replace(/^v/, '')
  if (tagged && compareVersions(version, tagged) <= 0) problems.push(`${version} isn't newer than the last release, ${tagged}.`)
  if (parseVersion(packageVersion) && compareVersions(version, packageVersion) < 0)
    problems.push(`${version} is older than the version in apps/desktop/package.json, ${packageVersion}.`)
  if (ci !== 'success')
    problems.push(
      ci === 'running'
        ? 'CI is still running on this commit: wait for it to finish.'
        : ci === 'none'
          ? 'CI hasn’t run on this commit yet.'
          : 'CI failed on this commit: fix it first.',
    )
  if (changes === 0) problems.push(`Nothing has changed since ${lastTag}.`)
  return problems
}

const run = (command, args) => execFileSync(command, args, { cwd: repository, encoding: 'utf8' }).trim()
const tryRun = (command, args) => {
  try {
    return execFileSync(command, args, { cwd: repository, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return null
  }
}

function ciConclusion(commit) {
  const runs = JSON.parse(
    tryRun('gh', ['run', 'list', '--workflow', 'ci.yml', '--commit', commit, '--json', 'status,conclusion', '--limit', '1']) ?? '[]',
  )
  if (!runs.length) return 'none'
  if (runs[0].status !== 'completed') return 'running'
  return runs[0].conclusion === 'success' ? 'success' : 'failed'
}

function gatherFacts(version) {
  tryRun('git', ['fetch', '--quiet', '--tags', 'origin', 'main'])
  const head = run('git', ['rev-parse', 'HEAD'])
  const lastTag = tryRun('git', ['describe', '--tags', '--abbrev=0', '--match', 'v[0-9]*'])
  const subjects = run('git', ['log', '--no-merges', '--reverse', '--format=%s', lastTag ? `${lastTag}..HEAD` : `${FIRST_COMMIT}^..HEAD`])
    .split('\n')
    .filter(Boolean)
  return {
    version,
    branch: run('git', ['rev-parse', '--abbrev-ref', 'HEAD']),
    uncommitted: run('git', ['status', '--porcelain']) !== '',
    upToDate: tryRun('git', ['rev-parse', 'origin/main']) === head,
    lastTag,
    packageVersion: JSON.parse(readFileSync(PACKAGE, 'utf8')).version,
    ci: ciConclusion(head),
    changes: subjects.length,
    subjects,
  }
}

const today = () => new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

function pullRequestBody(version, lastTag) {
  return `Release notes for Plot Device ${version}, written from the ${lastTag ? `commits since ${lastTag}` : 'start of this implementation (the first release)'}.

Before merging:

- [ ] **Write the summary** in \`CHANGELOG.md\`, replacing the \`<!-- Summary … -->\` line: two or three sentences for authors.
- [ ] **Edit the lines** so each makes sense to an author: reword, merge or drop them.

Merging tags \`v${version}\`. CI then builds the Linux files and the Windows installer and attaches them, with the notes, to a **draft** release. Try the AppImage, the \`.deb\` or the installer from the draft, then publish it: that's when update notices reach earlier copies.`
}

function main() {
  const [version, ...flags] = process.argv.slice(2)
  const dryRun = flags.includes('--dry-run')
  const facts = gatherFacts(version)
  const problems = releaseProblems(facts)
  const section = changelogSection({ version, date: today(), subjects: facts.subjects, since: facts.lastTag })

  if (dryRun) {
    console.log(section)
    console.log(problems.length ? `Not ready:\n${problems.map((p) => `  - ${p}`).join('\n')}` : 'Ready to release.')
    return
  }
  if (problems.length) {
    console.error(`Not ready to release ${version}:`)
    for (const problem of problems) console.error(`  - ${problem}`)
    process.exit(1)
  }

  const manifest = readFileSync(PACKAGE, 'utf8')
  writeFileSync(PACKAGE, manifest.replace(/"version": "[^"]*"/, `"version": "${version}"`))
  writeFileSync(METAINFO, withAppstreamRelease(readFileSync(METAINFO, 'utf8'), { version, date: today() }))
  writeFileSync(CHANGELOG, insertSection(existsSync(CHANGELOG) ? readFileSync(CHANGELOG, 'utf8') : null, section))

  const branch = `release/v${version}`
  run('git', ['switch', '-c', branch])
  run('git', ['add', PACKAGE, METAINFO, CHANGELOG])
  run('git', ['commit', '-m', `release: ${version}`])
  run('git', ['push', '-u', 'origin', branch])
  const url = run('gh', [
    'pr',
    'create',
    '--base',
    'main',
    '--head',
    branch,
    '--title',
    `Release ${version}`,
    '--body',
    pullRequestBody(version, facts.lastTag),
  ])
  console.log(`The release pull request is open: ${url}`)
  console.log('Write the summary and edit the notes there, then merge it.')
}

if (import.meta.main) main()
