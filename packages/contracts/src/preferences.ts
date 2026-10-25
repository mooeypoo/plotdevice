import { z } from 'zod'

export const themePreferenceSchema = z.enum(['system', 'light', 'dark'])
export const localeSchema = z.enum(['en', 'he'])

/** The author's personal settings. Stored in OS app data, never in a project folder. */
export const preferencesSchema = z.strictObject({ theme: themePreferenceSchema, locale: localeSchema })

/** A change to some settings; unknown keys are rejected rather than ignored. */
export const preferencesPatchSchema = preferencesSchema.partial()

export type ThemePreference = z.infer<typeof themePreferenceSchema>
export type Locale = z.infer<typeof localeSchema>
export type Preferences = z.infer<typeof preferencesSchema>
export type PreferencesPatch = z.infer<typeof preferencesPatchSchema>
