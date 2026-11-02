// The release workflows' helper (Milestone 15). Run from the repository root:
//   node tooling/release-notes.mjs check-commits <base>..<head>   every commit has a known prefix
//   node tooling/release-notes.mjs check <version>                 the notes are ready to publish
//   node tooling/release-notes.mjs notes <version>                 the notes, for the GitHub release
//   node tooling/release-notes.mjs latest <version>                latest.json, for update notices
//   node tooling/release-notes.mjs metainfo <version>              puts the notes in the Linux metadata
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  appstreamDescription,
  commitsWithoutPrefix,
  dateFor,
  latestJson,
  notesProblems,
  PREFIXES,
  sectionFor,
  withAppstreamRelease,
} from './changelog.mjs'

const repository = join(import.meta.dirname, '..')
const METAINFO = join(repository, 'apps/desktop/build/tech.moriel.plotdevice.metainfo.xml')
const [command, argument] = process.argv.slice(2)
const changelog = () => readFileSync(join(repository, 'CHANGELOG.md'), 'utf8')

function fail(lines) {
  for (const line of lines) console.error(line)
  process.exit(1)
}

function readyNotes(version) {
  const text = changelog()
  const problems = notesProblems(text, version)
  if (problems.length) fail(problems)
  return { section: sectionFor(text, version), date: dateFor(text, version) }
}

switch (command) {
  case 'check-commits': {
    const subjects = execFileSync('git', ['log', '--no-merges', '--format=%s', argument], { cwd: repository, encoding: 'utf8' })
      .split('\n')
      .filter(Boolean)
    const missing = commitsWithoutPrefix(subjects)
    if (missing.length)
      fail([
        `These commits need a prefix (${PREFIXES.join(', ')}). feat: and fix: lines become release notes, so write them for authors:`,
        ...missing.map((subject) => `  ${subject}`),
      ])
    console.log(`${subjects.length} commits, all with a prefix.`)
    break
  }
  case 'check':
    readyNotes(argument)
    console.log(`The notes for ${argument} are ready.`)
    break
  case 'notes':
    process.stdout.write(`${readyNotes(argument).section}\n`)
    break
  case 'latest':
    process.stdout.write(`${JSON.stringify(latestJson({ version: argument, date: readyNotes(argument).date }), null, 2)}\n`)
    break
  case 'metainfo': {
    const { section, date } = readyNotes(argument)
    const description = appstreamDescription(section)
    writeFileSync(METAINFO, withAppstreamRelease(readFileSync(METAINFO, 'utf8'), { version: argument, date, description }))
    console.log(`The Linux metadata has the notes for ${argument}.`)
    break
  }
  default:
    fail(['Usage: node tooling/release-notes.mjs check-commits|check|notes|latest|metainfo <argument>'])
}
