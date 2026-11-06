import { PANEL_WIDTHS, type PanelWidthSetting } from '@plotdevice/shared'
import { z } from 'zod'

export const themePreferenceSchema = z.enum(['system', 'light', 'dark'])
export const localeSchema = z.enum(['en', 'he'])
export const writingSizeSchema = z.enum(['small', 'medium', 'large'])
export const pageWidthSchema = z.enum(['narrow', 'medium', 'wide'])

const panelWidthSchema = (setting: PanelWidthSetting) => z.number().int().min(PANEL_WIDTHS[setting].min).max(PANEL_WIDTHS[setting].max)

/** The author's personal settings. Stored in OS app data, never in a project folder. */
export const preferencesSchema = z.strictObject({
  theme: themePreferenceSchema,
  locale: localeSchema,
  writingSize: writingSizeSchema,
  pageWidth: pageWidthSchema,
  /** Whether the app asks, once a day, if a newer version is out (Milestone 15). */
  checkForUpdates: z.boolean(),
  /** Whether pages, chapters and outline Text open as plain text, every mark showing (Milestone 16, ADR 0010). */
  plainTextByDefault: z.boolean(),
  /** Whether a "Plain text" switch shows beside Format, for authors who know Markdown (off by default). */
  plainTextSwitch: z.boolean(),
  /** Whether the author closed the outline guide, which shows above the first outline they open (Milestone 19). */
  outlineGuideSeen: z.boolean(),
  navigatorWidth: panelWidthSchema('navigatorWidth'),
  shelfWidth: panelWidthSchema('shelfWidth'),
})

/** A change to some settings; unknown keys are rejected rather than ignored. */
export const preferencesPatchSchema = preferencesSchema.partial()

export type ThemePreference = z.infer<typeof themePreferenceSchema>
export type Locale = z.infer<typeof localeSchema>
export type WritingSize = z.infer<typeof writingSizeSchema>
export type PageWidth = z.infer<typeof pageWidthSchema>
export type Preferences = z.infer<typeof preferencesSchema>
export type PreferencesPatch = z.infer<typeof preferencesPatchSchema>
