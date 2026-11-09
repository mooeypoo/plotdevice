/**
 * The comparison page's table (Milestone 25). Every competitor answer comes from the company's own pages,
 * checked on CHECKED (see SOURCES, and docs/research/comparison-2026-11.md). An answer is a message key in
 * src/i18n: `compare-yes`, `compare-no`, `compare-nd` (not documented), or a `compare-cell-…` message.
 * When an app's pages say nothing, the answer is "Not documented", never "No" (owner, 2026-11-09).
 */

export const CHECKED = 'compare-date'

export const APPS = ['plotdevice', 'gdocs', 'word', 'scrivener', 'dabble', 'novelcrafter', 'campfire', 'obsidian'] as const
export type App = (typeof APPS)[number]

/** Product names: never translated. */
export const NAMES: Record<App, string> = {
  plotdevice: 'Plot Device',
  gdocs: 'Google Docs',
  word: 'Microsoft Word',
  scrivener: 'Scrivener',
  dabble: 'Dabble',
  novelcrafter: 'Novelcrafter',
  campfire: 'Campfire',
  obsidian: 'Obsidian',
}

const Y = 'compare-yes'
const N = 'compare-no'
const ND = 'compare-nd'
const c = (key: string) => `compare-cell-${key}`

export interface Row {
  key: string
  answers: Record<App, string>
}
export interface Group {
  key: string
  rows: Row[]
}

export const GROUPS: Group[] = [
  {
    key: 'language',
    rows: [
      {
        key: 'ui',
        answers: {
          plotdevice: c('ui-pd'),
          gdocs: c('ui-many'),
          word: c('ui-many'),
          scrivener: c('ui-scrivener'),
          dabble: c('ui-english-nd'),
          novelcrafter: c('ui-english-nd'),
          campfire: c('ui-english'),
          obsidian: c('ui-many'),
        },
      },
      {
        key: 'rtl',
        answers: {
          plotdevice: Y,
          gdocs: Y,
          word: Y,
          scrivener: c('partly'),
          dabble: ND,
          novelcrafter: N,
          campfire: ND,
          obsidian: c('rtl-obsidian'),
        },
      },
      {
        key: 'mixed',
        answers: {
          plotdevice: Y,
          gdocs: Y,
          word: Y,
          scrivener: c('mixed-scrivener'),
          dabble: ND,
          novelcrafter: N,
          campfire: ND,
          obsidian: c('partly'),
        },
      },
    ],
  },
  {
    key: 'yours',
    rows: [
      {
        key: 'kept',
        answers: {
          plotdevice: c('kept-computer'),
          gdocs: c('kept-gdocs'),
          word: c('kept-word'),
          scrivener: c('kept-computer'),
          dabble: c('kept-dabble'),
          novelcrafter: c('kept-novelcrafter'),
          campfire: c('kept-campfire'),
          obsidian: c('kept-computer'),
        },
      },
      {
        key: 'account',
        answers: { plotdevice: N, gdocs: Y, word: c('account-word'), scrivener: N, dabble: Y, novelcrafter: Y, campfire: Y, obsidian: N },
      },
      {
        key: 'offline',
        answers: {
          plotdevice: Y,
          gdocs: c('offline-gdocs'),
          word: Y,
          scrivener: Y,
          dabble: c('offline-dabble'),
          novelcrafter: N,
          campfire: c('offline-campfire'),
          obsidian: Y,
        },
      },
      {
        key: 'ai',
        answers: {
          plotdevice: N,
          gdocs: c('ai-gdocs'),
          word: c('ai-word'),
          scrivener: N,
          dabble: N,
          novelcrafter: c('ai-novelcrafter'),
          campfire: ND,
          obsidian: c('ai-obsidian'),
        },
      },
      {
        key: 'files',
        answers: {
          plotdevice: c('files-plain'),
          gdocs: c('files-export'),
          word: c('files-word'),
          scrivener: c('files-scrivener'),
          dabble: c('files-export'),
          novelcrafter: c('files-export'),
          campfire: c('files-export'),
          obsidian: c('files-plain'),
        },
      },
    ],
  },
  {
    key: 'novel',
    rows: [
      {
        key: 'computers',
        answers: {
          plotdevice: c('computers-pd'),
          gdocs: c('computers-gdocs'),
          word: c('computers-word'),
          scrivener: c('computers-scrivener'),
          dabble: c('computers-dabble'),
          novelcrafter: c('computers-novelcrafter'),
          campfire: c('computers-campfire'),
          obsidian: c('computers-obsidian'),
        },
      },
      {
        key: 'planning',
        answers: {
          plotdevice: c('planning-pd'),
          gdocs: c('planning-outline'),
          word: c('planning-outline'),
          scrivener: c('planning-scrivener'),
          dabble: c('planning-dabble'),
          novelcrafter: c('planning-novelcrafter'),
          campfire: c('planning-campfire'),
          obsidian: c('planning-obsidian'),
        },
      },
      {
        key: 'wordin',
        answers: {
          plotdevice: Y,
          gdocs: Y,
          word: Y,
          scrivener: Y,
          dabble: Y,
          novelcrafter: Y,
          campfire: Y,
          obsidian: c('wordin-obsidian'),
        },
      },
      {
        key: 'export',
        answers: {
          plotdevice: c('export-all'),
          gdocs: c('export-all'),
          word: c('export-word'),
          scrivener: c('export-all'),
          dabble: c('export-wordonly'),
          novelcrafter: c('export-wordonly'),
          campfire: c('export-campfire'),
          obsidian: c('export-obsidian'),
        },
      },
    ],
  },
]

/** The companies' own pages each column is based on (checked 2026-11-09). */
export const SOURCES: Record<Exclude<App, 'plotdevice'>, string[]> = {
  gdocs: [
    'https://support.google.com/docs/answer/65166',
    'https://support.google.com/docs/answer/6388102',
    'https://support.google.com/docs/answer/14206696',
    'https://support.google.com/docs/answer/14615114',
    'https://workspaceupdates.googleblog.com/2016/03/export-google-docs-files-as-epub.html',
  ],
  word: [
    'https://support.microsoft.com/en-us/office/language-accessory-pack-for-microsoft-365-82ee1236-0f9a-45ee-9c72-05b026ee809f',
    'https://support.microsoft.com/en-au/office/languages/using-right-to-left-languages-in-office',
    'https://support.microsoft.com/en-us/privacy/copilot-in-microsoft-365-apps-for-home-your-data-and-privacy',
    'https://support.microsoft.com/en-us/office/how-to-turn-off-copilot-in-microsoft-365-family-and-personal-subscriptions-bc7e530b-152d-4123-8e78-edc06f8b85f1',
    'https://learn.microsoft.com/en-us/answers/a/12518002',
  ],
  scrivener: [
    'https://www.literatureandlatte.com/scrivener/overview',
    'https://www.literatureandlatte.com/blog/how-to-change-scriveners-interface-language',
    'https://forum.literatureandlatte.com/t/rtl-text-in-line-with-ltr/150950',
    'https://forum.literatureandlatte.com/t/compiling-documents-with-mixed-rtl-ltr-scripts-for-docx/145752',
    'https://scrivener.tenderapp.com/help/kb/general/does-scrivener-use-ai',
  ],
  dabble: [
    'https://www.dabblewriter.com/docs/apps-sync-offline',
    'https://www.dabblewriter.com/docs/apps-sync-offline/how-sync-works',
    'https://www.dabblewriter.com/docs/import-export-printing',
    'https://www.dabblewriter.com/docs/import-export-printing/export-your-manuscript',
    'https://www.dabblewriter.com/docs/reference/dabble-is-ai-free',
  ],
  novelcrafter: [
    'https://www.novelcrafter.com/help/faq/general/language-compatibility',
    'https://www.novelcrafter.com/help/faq/general/can-i-use-nc-in-ofline-mode',
    'https://www.novelcrafter.com/help/faq/ai-connections/does-novelcrafter-provide-its-own-ai',
    'https://www.novelcrafter.com/help/docs/export/novel',
    'https://www.novelcrafter.com/features',
  ],
  campfire: ['https://campfirewriting.com/faq', 'https://www.campfirewriting.com/apps', 'https://campfirewriting.com/word-processor'],
  obsidian: [
    'https://docs.obsidian.md/Plugins/User+interface/Right-to-left',
    'https://github.com/obsidianmd/obsidian-translations',
    'https://forum.obsidian.md/t/feature-request-improved-right-to-left-rtl-language-support/106103',
    'https://obsidian.md/help/import',
    'https://obsidian.md/help/pdf',
    'https://obsidian.md/privacy',
  ],
}
