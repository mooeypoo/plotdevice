import { docsLoader, i18nLoader } from '@astrojs/starlight/loaders'
import { docsSchema, i18nSchema } from '@astrojs/starlight/schema'
import { defineCollection } from 'astro:content'
import { z } from 'astro/zod'

// `docs`: the pages, one folder per language. `i18n`: the site's own words, where a language needs
// more than Starlight's built-in translations.
export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    // `sourceHash`: on a translated page, the hash of the English page it was translated from (see the
    // translation report, `pnpm site:translations`).
    schema: docsSchema({ extend: z.object({ sourceHash: z.string().optional() }) }),
  }),
  i18n: defineCollection({ loader: i18nLoader(), schema: i18nSchema() }),
}
