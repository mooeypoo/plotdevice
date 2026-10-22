import { defineConfig } from 'vitepress'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { releaseStatePath } from '../../tools/docs/release-data.ts'
import { releaseStateSchema, versionFeed } from '../../tools/release/published-release.ts'

const icon = `data:image/svg+xml,${encodeURIComponent(
  readFileSync(new URL('../../build/icon-small.svg', import.meta.url), 'utf8')
)}`

export default defineConfig({
  title: 'Plot Device',
  description: 'Write the novel. Keep the files. A field guide to writing in plain Markdown.',
  lang: 'en',
  base: '/plotdevice/',
  srcExclude: ['adr/**', 'release-plan.md', 'roadmap.md', 'releasing.md', 'testing-windows.md'],
  buildEnd(site) {
    const state = releaseStateSchema.parse(
      JSON.parse(readFileSync(releaseStatePath, 'utf8')) as unknown
    )
    if (state.source === 'github') {
      const directory = join(site.outDir, 'updates/v1')
      mkdirSync(directory, { recursive: true })
      writeFileSync(
        join(directory, 'latest.json'),
        `${JSON.stringify(versionFeed(state), null, 2)}\n`
      )
    }
  },
  head: [
    ['meta', { name: 'theme-color', content: '#f7f3eb' }],
    ['link', { rel: 'icon', type: 'image/svg+xml', href: icon }]
  ],
  themeConfig: {
    logo: { src: icon, alt: '' },
    siteTitle: 'Plot Device',
    nav: [
      { text: 'The guide', link: '/guide/start' },
      { text: 'Download', link: '/download' },
      { text: 'Release notes', link: '/releases' }
    ],
    sidebar: [
      {
        text: 'Begin',
        items: [
          { text: 'Start writing', link: '/guide/start' },
          { text: 'Install Plot Device', link: '/download' }
        ]
      },
      {
        text: 'Your writing desk',
        items: [
          { text: 'Write & organize', link: '/guide/writing' },
          { text: 'Characters, places & links', link: '/guide/codex' },
          { text: 'See the story', link: '/guide/story' },
          { text: 'Keep your work safe', link: '/guide/safety' }
        ]
      },
      {
        text: 'Keep close',
        items: [
          { text: 'Troubleshooting', link: '/guide/troubleshooting' },
          { text: 'Updates & privacy', link: '/updates' },
          { text: 'File format', link: '/file-format' },
          { text: 'Release notes', link: '/releases' }
        ]
      },
      {
        text: 'For contributors',
        collapsed: true,
        items: [
          { text: 'Translate the interface', link: '/guide/translation' },
          { text: 'Contribute', link: '/contributing' },
          { text: 'Development', link: '/development' },
          { text: 'Architecture', link: '/architecture' }
        ]
      }
    ],
    search: { provider: 'local' },
    socialLinks: [{ icon: 'github', link: 'https://github.com/mooeypoo/plotdevice' }],
    footer: {
      message: 'Your novel belongs to you. Software licensed GPL-3.0-or-later.',
      copyright: 'Created by Moriel Schottlender.'
    },
    outline: [2, 3]
  }
})
