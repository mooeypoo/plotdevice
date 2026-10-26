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
          items: [{ slug: 'start/install' }],
        },
      ],
      plugins: [starlightLinksValidator()],
    }),
  ],
})
