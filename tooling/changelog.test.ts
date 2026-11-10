import { describe, expect, it } from 'vitest'
import {
  appstreamDescription,
  changelogSection,
  CHANGELOG_HEADER,
  commitsWithoutPrefix,
  compareVersions,
  dateFor,
  insertSection,
  latestJson,
  notesProblems,
  sectionFor,
  SUMMARY_PLACEHOLDER,
  withAppstreamRelease,
} from './changelog.mjs'

describe('a version’s section, from its commits', () => {
  const subjects = [
    'docs: Milestone 13 plan, approved',
    'feat: the start screen offers "Already have notes or a draft? Moving them in →"',
    'fix: the Hebrew start screen says העבירו אותן למערכת',
    'test: outline timing',
    'perf: card moves on very large outlines',
    'feat(outline): tags on pages',
    'feat: tags on pages',
    'Milestone 9: a calmer look',
  ]

  it('keeps only what authors notice, grouped, in order, with the prefix removed and a capital letter', () => {
    expect(changelogSection({ version: '0.4.0', date: '2026-11-20', subjects })).toBe(
      [
        '## 0.4.0 — 2026-11-20',
        '',
        SUMMARY_PLACEHOLDER,
        '',
        '### New',
        '',
        '- The start screen offers "Already have notes or a draft? Moving them in →"',
        '- Tags on pages',
        '',
        '### Fixed',
        '',
        '- The Hebrew start screen says העבירו אותן למערכת',
        '',
        '### Faster',
        '',
        '- Card moves on very large outlines',
        '',
      ].join('\n'),
    )
  })

  it('ends with a link to every commit since the last tag, but not for the first release', () => {
    const later = changelogSection({ version: '0.4.0', date: '2026-11-20', subjects, since: 'v0.3.0' })
    expect(later.trimEnd().split('\n').at(-1)).toBe(
      'All changes, for developers: [v0.3.0…v0.4.0](https://github.com/mooeypoo/plotdevice/compare/v0.3.0...v0.4.0)',
    )
    expect(changelogSection({ version: '0.3.0', date: '2026-11-03', subjects })).not.toContain('All changes')
  })

  it('leaves out a group with nothing in it', () => {
    expect(changelogSection({ version: '0.4.1', date: '2026-11-21', subjects: ['fix: a typo in Hebrew'] })).not.toContain('### New')
  })
})

describe('the changelog file', () => {
  const older = changelogSection({ version: '0.3.0', date: '2026-11-05', subjects: ['feat: tags'] })
  const newer = changelogSection({ version: '0.4.0', date: '2026-11-20', subjects: ['fix: menus'] })
  const changelog = insertSection(insertSection(null, older), newer)

  it('starts from the header, and puts the newest version first', () => {
    expect(changelog.startsWith(CHANGELOG_HEADER)).toBe(true)
    expect(changelog.indexOf('## 0.4.0')).toBeLessThan(changelog.indexOf('## 0.3.0'))
  })

  it('reads one version’s section back, without its heading or the next version', () => {
    expect(sectionFor(changelog, '0.3.0')).toBe(`${SUMMARY_PLACEHOLDER}\n\n### New\n\n- Tags`)
    expect(sectionFor(changelog, '0.4.0')).not.toContain('Tags')
    expect(sectionFor(changelog, '0.5.0')).toBeNull()
    expect(dateFor(changelog, '0.4.0')).toBe('2026-11-20')
  })

  it('isn’t ready to publish until the summary is written', () => {
    expect(notesProblems(changelog, '0.4.0')).toEqual([expect.stringContaining('placeholder')])
    const written = changelog.replace(SUMMARY_PLACEHOLDER, 'Menus behave.')
    expect(notesProblems(written, '0.4.0')).toEqual([])
    expect(notesProblems(written, '0.9.0')).toEqual([expect.stringContaining('no section')])
  })

  it('refuses any comment left in the notes, not only the placeholder', () => {
    const halfEdited = changelog.replace(SUMMARY_PLACEHOLDER, '<!-- Summary: Menus behave. -->')
    expect(notesProblems(halfEdited, '0.4.0')).toEqual([expect.stringContaining('<!-- comment -->')])
    const leftOver = changelog.replace(SUMMARY_PLACEHOLDER, 'Menus behave.').replace('- Menus', '- Menus <!-- reword -->')
    expect(notesProblems(leftOver, '0.4.0')).toEqual([expect.stringContaining('<!-- comment -->')])
    const unclosed = changelog.replace(SUMMARY_PLACEHOLDER, 'Menus behave. -->')
    expect(notesProblems(unclosed, '0.4.0')).toEqual([expect.stringContaining('<!-- comment -->')])
  })

  it('refuses notes whose summary was deleted instead of written', () => {
    expect(notesProblems(changelog.replace(SUMMARY_PLACEHOLDER, ''), '0.4.0')).toEqual([expect.stringContaining('no summary')])
  })
})

describe('commit prefixes', () => {
  it('finds commits that would fall out of the changelog', () => {
    expect(commitsWithoutPrefix(['feat: a', 'fix(ui): b', 'feat!: c', 'release: 0.3.0', 'Milestone 9: d', 'feature: e', 'fix:f'])).toEqual([
      'Milestone 9: d',
      'feature: e',
      'fix:f',
    ])
  })
})

describe('versions', () => {
  it('compare by number, not as text', () => {
    expect(compareVersions('0.10.0', '0.9.0')).toBeGreaterThan(0)
    expect(compareVersions('1.0.0', '0.99.99')).toBeGreaterThan(0)
    expect(compareVersions('0.3.0', '0.3.0')).toBe(0)
    expect(compareVersions('0.3.0', '0.3.1')).toBeLessThan(0)
  })

  it('must be plain x.y.z', () => {
    expect(() => compareVersions('0.3.0-beta.1', '0.3.0')).toThrow(/0\.3\.0-beta\.1/)
    expect(() => compareVersions('0.3.0', 'v0.3.0')).toThrow(/v0\.3\.0/)
  })
})

describe('latest.json', () => {
  it('points at the release and the download page in each language', () => {
    expect(latestJson({ version: '0.4.0', date: '2026-11-20' })).toEqual({
      format: 1,
      version: '0.4.0',
      date: '2026-11-20',
      notes: 'https://github.com/mooeypoo/plotdevice/releases/tag/v0.4.0',
      download: {
        en: 'https://plotdevice.app/download/',
        he: 'https://plotdevice.app/he/download/',
      },
    })
  })
})

describe('the Linux metadata', () => {
  const metainfo = '<component>\n  <releases>\n    <release version="0.2.0" date="2026-10-25"/>\n  </releases>\n</component>\n'

  it('adds a version first, keeping the older ones', () => {
    expect(withAppstreamRelease(metainfo, { version: '0.3.0', date: '2026-11-05' })).toBe(
      '<component>\n  <releases>\n    <release version="0.3.0" date="2026-11-05"/>\n    <release version="0.2.0" date="2026-10-25"/>\n  </releases>\n</component>\n',
    )
  })

  it('fills in an existing version’s description, once', () => {
    const added = withAppstreamRelease(metainfo, { version: '0.3.0', date: '2026-11-05' })
    const described = withAppstreamRelease(added, {
      version: '0.3.0',
      date: '2026-11-05',
      description: '<description><p>A</p></description>',
    })
    const again = withAppstreamRelease(described, {
      version: '0.3.0',
      date: '2026-11-05',
      description: '<description><p>B</p></description>',
    })
    expect(again.match(/version="0\.3\.0"/g)).toHaveLength(1)
    expect(again).toContain('<release version="0.3.0" date="2026-11-05"><description><p>B</p></description></release>')
    expect(again).toContain('<release version="0.2.0" date="2026-10-25"/>')
  })

  it('leaves the developers’ link out of the Linux metadata', () => {
    const section =
      sectionFor(changelogSection({ version: '0.4.0', date: '2026-11-20', subjects: ['feat: tags'], since: 'v0.3.0' }), '0.4.0') ?? ''
    expect(appstreamDescription(section)).not.toContain('All changes')
  })

  it('turns the notes into paragraphs and lists, with no Markdown or unescaped characters', () => {
    const section = `${SUMMARY_PLACEHOLDER}\n\nTags & [links](https://example.com), *finally*.\n\n### New\n\n- Tags <on> pages\n- Hebrew: תגיות`
    expect(appstreamDescription(section)).toBe(
      '<description><p>Tags &amp; links, finally.</p><p>New</p><ul><li>Tags &lt;on&gt; pages</li><li>Hebrew: תגיות</li></ul></description>',
    )
  })
})
