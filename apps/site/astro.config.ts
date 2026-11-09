import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'
import starlightLinksValidator from 'starlight-links-validator'

// Plot Device's website (Milestone 24): the pages about Plot Device (src/pages) and the guide under docs/.
// English is the default, at the root; Hebrew is under /he/ (owner, 2026-11-09). A new language is one more
// entry in `locales` (and in LANGUAGES, src/site.ts); its untranslated guide pages fall back to English
// with a notice.
export default defineConfig({
  site: 'https://plotdevice.app',
  trailingSlash: 'always',
  // The guide has no front page of its own: it starts at installing.
  redirects: {
    '/docs': '/docs/start/install/',
    '/he/docs': '/he/docs/start/install/',
  },
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
        SocialIcons: './src/components/SiteLinks.astro',
      },
      sidebar: [
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
          label: 'Your files',
          translations: { he: 'הקבצים שלך' },
          items: ['docs/files/folder', 'docs/files/chapters', 'docs/files/outlines', 'docs/files/pages'],
        },
        {
          label: 'Reference',
          translations: { he: 'עיון' },
          items: ['docs/reference/shortcuts', 'docs/reference/settings', 'docs/reference/questions', 'docs/reference/words'],
        },
        {
          label: 'About',
          translations: { he: 'אודות' },
          items: ['docs/about/credits', 'docs/about/translate', 'docs/about/problems'],
        },
      ],
      // The site's own pages (src/pages) aren't Starlight's, so the link checker can't see them; the site
      // tests check their links instead.
      plugins: [starlightLinksValidator({ exclude: ['/', '/{support,languages}/', '/he/', '/he/{support,languages}/'] })],
    }),
  ],
})
