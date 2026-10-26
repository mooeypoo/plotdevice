/** Pages outside the app, opened in the person's browser. The host allows only these (external-links.ts). */
export const AUTHOR_SITE = 'https://moriel.tech'
export const DOCUMENTATION = 'https://mooeypoo.github.io/plotdevice/'

/** The documentation in the interface's language: English at the root, other languages under their code. */
export const documentationFor = (locale: string): string => (locale === 'en' ? DOCUMENTATION : `${DOCUMENTATION}${locale}/`)
