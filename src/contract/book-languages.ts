/**
 * The book languages the app has words for (ADR 0019), named in their own language, so the
 * renderer can offer them. The main process checks this list against its word catalogs.
 */
export const BOOK_LANGUAGE_CHOICES = [
  { tag: 'en', name: 'English', direction: 'ltr' },
  { tag: 'he', name: 'עברית', direction: 'rtl' }
] as const
