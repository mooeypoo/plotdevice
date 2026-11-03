import { describe, expect, it } from 'vitest'
import { releaseProblems } from './release.mjs'

const ready = {
  version: '0.4.0',
  branch: 'main',
  uncommitted: false,
  upToDate: true,
  lastTag: 'v0.3.0',
  packageVersion: '0.3.0',
  ci: 'success',
  changes: 12,
}

describe('preparing a release', () => {
  it('goes ahead when main is ready', () => {
    expect(releaseProblems(ready)).toEqual([])
  })

  it('allows the first release, with no earlier tag', () => {
    expect(releaseProblems({ ...ready, version: '0.3.0', lastTag: null, packageVersion: '0.2.0' })).toEqual([])
  })

  it.each([
    [{ version: '0.4.0-beta.1' }, /plain version number/],
    [{ version: undefined }, /plain version number/],
    [{ branch: 'milestone-15/first-release' }, /Release from main/],
    [{ uncommitted: true }, /uncommitted/],
    [{ upToDate: false }, /differs from GitHub/],
    [{ version: '0.3.0' }, /isn't newer than the last release, 0\.3\.0/],
    [{ version: '0.2.9', lastTag: null }, /older than the version in apps\/desktop\/package\.json/],
    [{ ci: 'failed' }, /CI failed/],
    [{ ci: 'running' }, /still running/],
    [{ ci: 'none' }, /hasn’t run/],
    [{ changes: 0 }, /Nothing has changed since v0\.3\.0/],
  ])('refuses %j', (change, problem) => {
    expect(releaseProblems({ ...ready, ...change })).toEqual([expect.stringMatching(problem)])
  })
})
