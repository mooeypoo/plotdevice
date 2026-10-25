import type { PlotBoardDto, RecentProjectDto } from '../../../contract/dtos'
import type { createFakePlotDeviceApi } from '../app/fake-plot-device-api'

/*
 * Invented sample text for the preview harness ("The Salt Orchard"), layered onto the test fake so
 * screens look lived-in. Never a real book.
 */

const FERRY = `The ferry came in low against the water, its engine coughing the way it had every autumn since [[Ilka]] was a girl.

She stood at the rail with her one bag and watched [[Marrow]] rise out of the fog: the cannery chimney first, then the church, then the long grey line of the orchard wall.

[[Aunt Bea]] was already at the gate. Of course she was.

"You came," Bea said, as if Ilka had been expected for years and not merely since Tuesday.`

const FROST = `The first frost took the low branches in a single night. By morning the orchard smelled of iron and cider, and the pickers stood in the lane, breath clouding, waiting to be told what was lost.`

const OUTLINE = `The plan in one breath: Ilka comes back for the orchard and stays for the strike.

## Part One
- [[The Ferry]]: Ilka arrives; Bea is already at the gate. #main
  - Open on the water, not the town.
- [[First frost]]: the orchard's first loss. #main
- Ilka finds the ledger. Bea lies about it.

## Part Two
- The cannery whistle stops.
- Who told the foreman?

## Inbox
- The orchard gate should creak in every chapter it appears.
`

const BOARD: PlotBoardDto = {
  path: 'Outline.md',
  version: 'preview',
  preamble: 'The plan in one breath: Ilka comes back for the orchard and stays for the strike.',
  columns: [
    {
      line: 2,
      title: 'Part One',
      inbox: false,
      beats: [
        {
          line: 3,
          title: '[[The Ferry]]: Ilka arrives; Bea is already at the gate. #main',
          notes: '- Open on the water, not the town.',
          tags: ['main'],
          threads: ['main'],
          chapter: {
            path: 'The Ferry.md',
            title: 'The Ferry',
            status: 'draft',
            pov: ['Ilka'],
            wordCount: 92,
            synopsis: 'Ilka returns to Marrow; Bea meets her at the gate as if she never left.'
          }
        },
        {
          line: 5,
          title: "[[First frost]]: the orchard's first loss. #main",
          notes: '',
          tags: ['main'],
          threads: ['main'],
          chapter: {
            path: 'First frost.md',
            title: 'First frost',
            status: 'outline',
            pov: [],
            wordCount: 41
          }
        },
        {
          line: 6,
          title: 'Ilka finds the ledger. Bea lies about it.',
          notes: '',
          tags: [],
          threads: []
        }
      ]
    },
    {
      line: 8,
      title: 'Part Two',
      inbox: false,
      beats: [
        { line: 9, title: 'The cannery whistle stops.', notes: '', tags: [], threads: [] },
        { line: 10, title: 'Who told the foreman?', notes: '', tags: [], threads: [] }
      ]
    },
    {
      line: 12,
      title: 'Inbox',
      inbox: true,
      beats: [
        {
          line: 13,
          title: 'The orchard gate should creak in every chapter it appears.',
          notes: '',
          tags: [],
          threads: []
        }
      ]
    }
  ],
  threads: [
    { key: 'main', name: 'Main plot', color: '#4f7cac' },
    { key: 'strike', name: 'The cannery strike', color: '#b5654a' }
  ]
}

const RECENTS: readonly RecentProjectDto[] = [
  {
    root: '/novels/salt-orchard',
    title: 'The Salt Orchard',
    lastOpenedAt: '2026-10-22T18:00:00.000Z',
    available: true
  },
  {
    root: '/novels/winter-ledger',
    title: 'The Winter Ledger',
    lastOpenedAt: '2026-09-30T09:00:00.000Z',
    available: true
  }
]

/** Fills the test fake with fuller invented text, a board and recent projects. */
export function enrichSample(fake: ReturnType<typeof createFakePlotDeviceApi>): void {
  fake.files.set('The Ferry.md', FERRY)
  fake.files.set('First frost.md', FROST)
  fake.files.set('Outline.md', OUTLINE)
  fake.board.current = BOARD
  fake.api.workspace.listRecentProjects = () => Promise.resolve({ ok: true, value: RECENTS })
}
