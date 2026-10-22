import { acceptHMRUpdate, defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { z } from 'zod'
import type { ApiResult } from '../../../contract/dtos'
import type { MessageKey } from '../../../i18n/translator'
import { useUiLanguageStore } from './ui-language-store'

/** Supported display sizes; these never change the markdown itself. */
export const PROSE_FONT_SIZE = { min: 14, max: 28, default: 19 } as const
/** Preferred maximum line lengths, measured in the prose font's character units. */
export const PROSE_LINE_WIDTH = { min: 45, max: 90, default: 66 } as const
/** The reference outline's preferred width; smaller windows constrain its displayed width. */
export const OUTLINE_WIDTH = { min: 240, max: 720, default: 320 } as const
/** Available prose direction modes, independent of the interface language. */
export const WRITING_DIRECTIONS = ['auto', 'ltr', 'rtl'] as const
/** A writer-selected direction mode for the prose surface. */
export type WritingDirection = (typeof WRITING_DIRECTIONS)[number]

const KEY = 'plotdevice.writingPreferences'
const fontSizeSchema = z.number().int().min(PROSE_FONT_SIZE.min).max(PROSE_FONT_SIZE.max)
const lineWidthSchema = z.number().int().min(PROSE_LINE_WIDTH.min).max(PROSE_LINE_WIDTH.max)
const outlineWidthSchema = z.number().int().min(OUTLINE_WIDTH.min).max(OUTLINE_WIDTH.max)
const writingDirectionSchema = z.enum(WRITING_DIRECTIONS)
const characterViewSchema = z.object({
  mode: z.enum(['all', 'grouped']),
  filters: z.array(z.string()),
  collapsed: z.array(z.string())
})
/** Per-project character navigation; membership itself stays in the Markdown files. */
export type CharacterViewPreferences = z.infer<typeof characterViewSchema>
const preferencesSchema = z.object({
  version: z.literal(1),
  fontSize: fontSizeSchema,
  lineWidth: lineWidthSchema,
  outlineWidth: outlineWidthSchema.default(OUTLINE_WIDTH.default),
  writingDirection: writingDirectionSchema.default('auto'),
  /** Fade panels and bars while typing; off unless the writer turns it on. */
  fadeWhileTyping: z.boolean().default(false),
  /** Experimental: capture beats into the current outline's Inbox (brief §4.4); off by default. */
  captureBeats: z.boolean().default(false),
  /** With capture on, end each captured beat with a link to the Writing chapter (Q10). */
  captureLinksChapter: z.boolean().default(false),
  characterViews: z.record(z.string(), characterViewSchema).default({}),
  collapsedParts: z.record(z.string(), z.array(z.string()))
})
type WritingPreferences = z.infer<typeof preferencesSchema>
type PreferenceNotice = Extract<MessageKey, `preferences-notice-${string}`>

function defaults(): WritingPreferences {
  return {
    version: 1,
    fontSize: PROSE_FONT_SIZE.default,
    lineWidth: PROSE_LINE_WIDTH.default,
    outlineWidth: OUTLINE_WIDTH.default,
    writingDirection: 'auto',
    fadeWhileTyping: false,
    captureBeats: false,
    captureLinksChapter: false,
    characterViews: {},
    collapsedParts: {}
  }
}

/** Per-user display preferences in Chromium's userData storage, never in the novel folder. */
export const useWritingPreferencesStore = defineStore('writing-preferences', () => {
  const language = useUiLanguageStore()
  const storageNoticeKey = ref<PreferenceNotice | null>(null)
  const storageNotice = computed(() =>
    storageNoticeKey.value === null ? '' : language.t(storageNoticeKey.value)
  )
  const preferences = ref(load())

  function reportStorageFailure(notice: PreferenceNotice, error: unknown): void {
    storageNoticeKey.value = notice
    console.warn('Writing preferences storage failure.', notice, error)
  }

  function load(): WritingPreferences {
    let text: string | null
    try {
      text = localStorage.getItem(KEY)
    } catch (error) {
      reportStorageFailure('preferences-notice-load-failed', error)
      return defaults()
    }
    if (text === null) return defaults()
    let value: unknown
    try {
      value = JSON.parse(text) as unknown
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error
      reportStorageFailure('preferences-notice-invalid', error)
      return defaults()
    }
    const parsed = preferencesSchema.safeParse(value)
    if (parsed.success) return parsed.data
    reportStorageFailure('preferences-notice-invalid', parsed.error)
    return defaults()
  }

  function save(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(preferences.value))
      storageNoticeKey.value = null
    } catch (error) {
      reportStorageFailure('preferences-notice-save-failed', error)
    }
  }

  function setTypography(key: 'fontSize' | 'lineWidth', value: number): ApiResult<void> {
    const parsed = (key === 'fontSize' ? fontSizeSchema : lineWidthSchema).safeParse(value)
    if (!parsed.success) {
      const error = { code: 'invalid-writing-preference', message: parsed.error.message }
      console.warn('Invalid writing preference.', error)
      return { ok: false, error }
    }
    preferences.value[key] = parsed.data
    save()
    return { ok: true, value: undefined }
  }

  function setFontSize(value: number): ApiResult<void> {
    return setTypography('fontSize', value)
  }

  function setLineWidth(value: number): ApiResult<void> {
    return setTypography('lineWidth', value)
  }

  function setWritingDirection(value: unknown): ApiResult<void> {
    const parsed = writingDirectionSchema.safeParse(value)
    if (!parsed.success) {
      const error = { code: 'invalid-writing-direction', message: parsed.error.message }
      console.warn('Invalid writing direction.', error)
      return { ok: false, error }
    }
    preferences.value.writingDirection = parsed.data
    save()
    return { ok: true, value: undefined }
  }

  function setFadeWhileTyping(on: boolean): void {
    preferences.value.fadeWhileTyping = on
    save()
  }

  function setCaptureBeats(on: boolean): void {
    preferences.value.captureBeats = on
    save()
  }

  function setCaptureLinksChapter(on: boolean): void {
    preferences.value.captureLinksChapter = on
    save()
  }

  function resetTypography(): void {
    preferences.value.fontSize = PROSE_FONT_SIZE.default
    preferences.value.lineWidth = PROSE_LINE_WIDTH.default
    save()
  }

  function setOutlineWidth(value: number): ApiResult<void> {
    const parsed = outlineWidthSchema.safeParse(value)
    if (!parsed.success) {
      const error = { code: 'invalid-writing-preference', message: parsed.error.message }
      console.warn('Invalid outline width.', error)
      return { ok: false, error }
    }

    preferences.value.outlineWidth = parsed.data
    save()
    return { ok: true, value: undefined }
  }

  function characterView(root: string): CharacterViewPreferences {
    return preferences.value.characterViews[root] ?? { mode: 'all', filters: [], collapsed: [] }
  }

  function setCharacterView(root: string, view: CharacterViewPreferences): void {
    preferences.value.characterViews = { ...preferences.value.characterViews, [root]: view }
    save()
  }

  function isPartCollapsed(root: string, path: string): boolean {
    return preferences.value.collapsedParts[root]?.includes(path) ?? false
  }

  function setPartCollapsed(root: string, path: string, collapsed: boolean): void {
    const paths = preferences.value.collapsedParts[root] ?? []
    const next = paths.filter((existing) => existing !== path)
    if (collapsed) next.push(path)
    const others = Object.entries(preferences.value.collapsedParts).filter(([key]) => key !== root)
    preferences.value.collapsedParts = Object.fromEntries(
      next.length === 0 ? others : [...others, [root, next]]
    )
    save()
  }

  const fontSize = computed({
    get: () => preferences.value.fontSize,
    set: (value: number) => {
      setFontSize(value)
    }
  })
  const lineWidth = computed({
    get: () => preferences.value.lineWidth,
    set: (value: number) => {
      setLineWidth(value)
    }
  })
  const proseStyle = computed(() => ({
    '--prose-size': `${String(fontSize.value)}px`,
    '--measure': `${String(lineWidth.value)}ch`
  }))

  return {
    fontSize,
    lineWidth,
    writingDirection: computed(() => preferences.value.writingDirection),
    proseStyle,
    storageNotice,
    setFontSize,
    setLineWidth,
    setWritingDirection,
    fadeWhileTyping: computed(() => preferences.value.fadeWhileTyping),
    setFadeWhileTyping,
    captureBeats: computed(() => preferences.value.captureBeats),
    setCaptureBeats,
    captureLinksChapter: computed(() => preferences.value.captureLinksChapter),
    setCaptureLinksChapter,
    resetTypography,
    outlineWidth: computed(() => preferences.value.outlineWidth),
    setOutlineWidth,
    characterView,
    setCharacterView,
    isPartCollapsed,
    setPartCollapsed
  }
})

// Keep the store's state and pick up changed actions when Vite hot-reloads this file in development.
if (import.meta.hot)
  import.meta.hot.accept(acceptHMRUpdate(useWritingPreferencesStore, import.meta.hot))
