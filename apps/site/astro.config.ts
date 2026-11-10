import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'
import starlightLinksValidator from 'starlight-links-validator'
import starlightSidebarTopics from 'starlight-sidebar-topics'

// Plot Device's website (Milestone 24): the pages about Plot Device (src/pages) and the guide under docs/.
// English is the default, at the root; Hebrew is under /he/ (owner, 2026-11-09). A new language is one more
// entry in `locales` (and in LANGUAGES, src/site.ts); its untranslated guide pages fall back to English
// with a notice.
export default defineConfig({
  site: 'https://plotdevice.app',
  trailingSlash: 'always',
  integrations: [
    starlight({
      title: 'Plot Device',
      description: 'A calm writing studio for novelists, in plain Markdown files.',
      logo: { light: './src/assets/mark-light.svg', dark: './src/assets/mark-dark.svg' },
      defaultLocale: 'root',
      locales: {
        root: { label: 'English', lang: 'en' },
        he: { label: 'עברית', lang: 'he', dir: 'rtl' },
      },
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/mooeypoo/plotdevice' }],
      customCss: ['./src/styles/fonts.css', './src/styles/site.css'],
      components: {
        Head: './src/components/Head.astro',
        Header: './src/components/Header.astro',
        Sidebar: './src/components/Sidebar.astro',
        SocialIcons: './src/components/SiteLinks.astro',
      },
      // Two sidebars (Milestone 25, owner 2026-11-09): the Guide, for writers, which is all the site's
      // menus lead to; and the Technical docs, for translators and developers, reached from quiet links.
      // The plugin's switcher between them is left out (src/components/Sidebar.astro), so a writer never
      // lands there by accident.
      plugins: [
        starlightSidebarTopics([
          {
            label: { en: 'Guide', he: 'מדריך' },
            link: '/docs/start/install/',
            items: [
              {
                label: 'Start here',
                translations: { he: 'מתחילים' },
                items: ['docs/start/install', 'docs/start/first-book', 'docs/start/tour', 'docs/start/bring-in', 'docs/start/from-word'],
              },
              {
                label: 'Writing',
                translations: { he: 'כתיבה' },
                items: [
                  'docs/writing/chapters-and-parts',
                  'docs/writing/moving-chapters',
                  'docs/writing/formatting',
                  'docs/writing/poems',
                  'docs/writing/hebrew-and-english',
                  'docs/writing/the-page',
                  'docs/writing/references',
                ],
              },
              {
                label: 'Planning',
                translations: { he: 'תכנון' },
                items: [
                  'docs/planning/outlines',
                  'docs/planning/timeline',
                  'docs/planning/cards',
                  'docs/planning/linking',
                  'docs/planning/pages',
                  'docs/planning/kinds',
                  'docs/planning/tags',
                  'docs/planning/book-chapters',
                ],
              },
              {
                label: 'Keeping it safe',
                translations: { he: 'שמירה על הכתוב' },
                items: ['docs/safe/saving', 'docs/safe/versions', 'docs/safe/other-apps', 'docs/safe/backups'],
              },
              {
                label: 'Sharing',
                translations: { he: 'שיתוף' },
                items: ['docs/sharing/export'],
              },
              {
                label: 'Help',
                translations: { he: 'עזרה' },
                items: [
                  'docs/reference/questions',
                  'docs/reference/settings',
                  'docs/reference/shortcuts',
                  'docs/reference/words',
                  'docs/about/problems',
                  'docs/about/credits',
                ],
              },
            ],
          },
          {
            label: { en: 'Technical docs', he: 'תיעוד טכני' },
            link: '/docs/technical/files/folder/',
            items: [
              { slug: 'docs/start/install', label: '← Back to the guide', translations: { he: '→ חזרה למדריך' } },
              {
                label: "The book's files",
                translations: { he: 'קובצי הספר' },
                items: [
                  'docs/technical/files/folder',
                  'docs/technical/files/chapters',
                  'docs/technical/files/outlines',
                  'docs/technical/files/pages',
                ],
              },
              {
                label: 'Working on Plot Device',
                translations: { he: 'עבודה על Plot Device' },
                items: ['docs/technical/translate', 'docs/technical/assistants'],
              },
            ],
          },
        ]),
        // The site's own pages (src/pages) aren't Starlight's, so the link checker can't see them; the site
        // tests check their links instead.
        starlightLinksValidator({
          exclude: [
            '/',
            '/{support,languages}/',
            '/he/',
            '/he/{support,languages}/',
            '/compare/',
            '/he/compare/',
            '/download/',
            '/he/download/',
          ],
        }),
      ],
    }),
  ],
})
