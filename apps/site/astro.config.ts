import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'
import starlightLinksValidator from 'starlight-links-validator'

// Plot Device's documentation (Milestone 10). English at the root, Hebrew at /he/; a new language is
// one more entry in `locales`, and its untranslated pages fall back to English with a notice.
export default defineConfig({
  site: 'https://mooeypoo.github.io',
  base: '/plotdevice',
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
      components: { Head: './src/components/Head.astro' },
      sidebar: [
        {
          label: 'Start here',
          translations: { he: 'מתחילים' },
          items: ['start/install', 'start/first-book', 'start/tour'],
        },
        {
          label: 'Writing',
          translations: { he: 'כתיבה' },
          items: [
            'writing/chapters-and-parts',
            'writing/moving-chapters',
            'writing/formatting',
            'writing/hebrew-and-english',
            'writing/the-page',
            'writing/references',
          ],
        },
        {
          label: 'Planning',
          translations: { he: 'תכנון' },
          items: ['planning/outlines', 'planning/cards', 'planning/linking', 'planning/pages', 'planning/book-chapters'],
        },
        {
          label: 'Keeping it safe',
          translations: { he: 'שמירה על הכתוב' },
          items: ['safe/saving', 'safe/versions', 'safe/other-apps', 'safe/backups'],
        },
        {
          label: 'Sharing',
          translations: { he: 'שיתוף' },
          items: ['sharing/export'],
        },
        {
          label: 'Your files',
          translations: { he: 'הקבצים שלך' },
          items: ['files/folder', 'files/chapters', 'files/outlines', 'files/pages'],
        },
        {
          label: 'Reference',
          translations: { he: 'עיון' },
          items: ['reference/shortcuts', 'reference/settings', 'reference/questions', 'reference/words'],
        },
        {
          label: 'About',
          translations: { he: 'אודות' },
          items: ['about/credits', 'about/translate', 'about/problems'],
        },
      ],
      plugins: [starlightLinksValidator()],
    }),
  ],
})
