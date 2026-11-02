/** Pages outside the app, opened in the person's browser. The host allows only these (external-links.ts). */
export const AUTHOR_SITE = 'https://moriel.tech'
export const DOCUMENTATION = 'https://mooeypoo.github.io/plotdevice/'

/** The documentation in the interface's language: English at the root, other languages under their code. */
export const documentationFor = (locale: string): string => (locale === 'en' ? DOCUMENTATION : `${DOCUMENTATION}${locale}/`)

/** The guide to moving an existing book in (Milestone 13), offered on the start screen. */
export const bringInGuideFor = (locale: string): string => `${documentationFor(locale)}start/bring-in/`

/** Plot Device on GitHub: release notes and the issue forms (Milestone 15). */
export const REPOSITORY = 'https://github.com/mooeypoo/plotdevice'
export const COFFEE = 'https://buymeacoffee.com/mooeypoo'

const SYSTEMS: Record<string, string> = { linux: 'Linux', win32: 'Windows', darwin: 'macOS' }

/** The problem form, with the version and system already filled in, so the author needn't look them up. */
export const problemReportFor = (version: string, platform: string): string =>
  `${REPOSITORY}/issues/new?${new URLSearchParams({ template: 'problem.yml', version, system: SYSTEMS[platform] ?? '' })}`

export const IDEA_FORM = `${REPOSITORY}/issues/new?template=idea.yml`
