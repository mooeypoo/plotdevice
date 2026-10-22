import { z } from 'zod'
import type { Layout } from './layout'
import { isPresetId, PRESETS } from './presets'
import { validLayoutName, layoutNameKey } from './layout-name'
import { validateLayout } from './validate-layout'
import type { Mode } from './vocabulary'

/** A layout the writer saved under a name of their own. */
export interface SavedLayout {
  readonly id: string
  readonly name: string
}

/**
 * Per-user layout settings: rearranged presets and the writer's own layouts. They hold no project
 * paths, so one arrangement serves every project.
 */
export interface WorkbenchSettings {
  readonly version: 1
  /** Which shell renders the project: the workbench, or the classic fixed panels until W6. */
  readonly shell: WorkbenchShell
  /** Which fields entry cards show, by entry kind; a missing kind uses the cards' defaults. */
  readonly cardFields: Readonly<Record<string, readonly string[]>>
  /** A preset's id maps to its rearrangement; a saved layout's id to its arrangement. */
  readonly arrangements: Readonly<Record<string, Layout>>
  readonly saved: readonly SavedLayout[]
}

/** The two shells while the classic one remains available. */
export const WORKBENCH_SHELLS = ['workbench', 'classic'] as const
/** A shell choice. */
export type WorkbenchShell = (typeof WORKBENCH_SHELLS)[number]

/** Settings with every preset as shipped and no saved layouts. */
export function defaultWorkbenchSettings(): WorkbenchSettings {
  return { version: 1, shell: 'workbench', cardFields: {}, arrangements: {}, saved: [] }
}

const envelopeSchema = z.object({
  version: z.literal(1),
  shell: z.enum(WORKBENCH_SHELLS).default('workbench'),
  cardFields: z.record(z.string(), z.array(z.string())).default({}),
  arrangements: z.record(z.string(), z.unknown()),
  saved: z.array(z.unknown())
})
const savedSchema = z.object({ id: z.string().min(1).max(100), name: z.string() })

/** Stored settings read back, with how many entries had to be left out. */
export interface ParsedWorkbenchSettings {
  readonly settings: WorkbenchSettings
  /** Saved layouts and preset rearrangements that were invalid and are not used. */
  readonly dropped: number
}

/**
 * Reads stored settings, or `undefined` if their envelope is unusable. An invalid layout is
 * left out on its own, so one bad entry never costs the writer the others.
 */
export function parseWorkbenchSettings(value: unknown): ParsedWorkbenchSettings | undefined {
  const envelope = envelopeSchema.safeParse(value)
  if (!envelope.success) return undefined
  const stored = envelope.data.arrangements
  const arrangements: Record<string, Layout> = {}
  const saved: SavedLayout[] = []
  const names = new Set<string>()
  const named = new Set<string>()
  let dropped = 0

  for (const entry of envelope.data.saved) {
    const parsed = savedSchema.safeParse(entry)
    if (parsed.success) named.add(parsed.data.id)
    const name = parsed.success ? validLayoutName(parsed.data.name) : undefined
    const id = parsed.success ? parsed.data.id : ''
    const checked = id in stored ? validateLayout(stored[id]) : undefined
    if (
      name === undefined ||
      checked?.ok !== true ||
      isPresetId(id) ||
      id in arrangements ||
      names.has(layoutNameKey(name))
    ) {
      dropped += 1
      continue
    }
    names.add(layoutNameKey(name))
    saved.push({ id, name })
    arrangements[id] = checked.value
  }
  for (const [id, layout] of Object.entries(stored)) {
    if (isPresetId(id)) {
      const checked = validateLayout(layout)
      if (checked.ok && checked.value.mode === PRESETS[id].mode) arrangements[id] = checked.value
      else dropped += 1
    } else if (!named.has(id)) {
      // An arrangement without a saved name can't be chosen.
      dropped += 1
    }
  }
  const { shell, cardFields } = envelope.data
  return { settings: { version: 1, shell, cardFields, arrangements, saved }, dropped }
}

const projectSchema = z.object({
  active: z.object({ writing: z.string(), plotting: z.string() }),
  /** A pinned section's entry, by section id. */
  pins: z.record(z.string(), z.string()),
  /** The card stack's pinned entries, in order. */
  cards: z.array(z.string()),
  /** Pinned cards the writer collapsed to one line. */
  collapsedCards: z.array(z.string()).default([]),
  /** Each split's document, and whether it keeps it when the writer navigates. */
  splits: z.record(z.string(), z.object({ path: z.string(), locked: z.boolean() })),
  /** The outline the board and the outline view show. */
  outlinePath: z.string().nullable()
})

/** Per-project workbench state: everything that names a file in that project. */
export type ProjectBindings = z.infer<typeof projectSchema>

const projectsSchema = z.object({
  version: z.literal(1),
  projects: z.record(z.string(), projectSchema)
})

/** Per-project bindings for every project, keyed by project root. */
export type WorkbenchProjects = z.infer<typeof projectsSchema>

/** No project bindings yet. */
export function defaultWorkbenchProjects(): WorkbenchProjects {
  return { version: 1, projects: {} }
}

/** A project's bindings before the writer pins or locks anything. */
export function defaultProjectBindings(): ProjectBindings {
  return {
    active: { writing: 'write', plotting: 'plot' },
    pins: {},
    cards: [],
    collapsedCards: [],
    splits: {},
    outlinePath: null
  }
}

/** Reads stored project bindings, or `undefined` if they are unusable. */
export function parseWorkbenchProjects(value: unknown): WorkbenchProjects | undefined {
  const parsed = projectsSchema.safeParse(value)
  return parsed.success ? parsed.data : undefined
}

/** The arrangement `id` currently has: the writer's, or the preset as shipped. */
export function layoutFor(settings: WorkbenchSettings, id: string): Layout | undefined {
  return settings.arrangements[id] ?? (isPresetId(id) ? PRESETS[id] : undefined)
}

/** A layout the writer can choose in `mode`. */
export type LayoutChoice =
  | { readonly kind: 'preset'; readonly id: string }
  | { readonly kind: 'saved'; readonly id: string; readonly name: string }

/** The presets and saved layouts available in `mode`, presets first. */
export function layoutChoices(settings: WorkbenchSettings, mode: Mode): readonly LayoutChoice[] {
  const presets = Object.entries(PRESETS)
    .filter(([, layout]) => layout.mode === mode)
    .map(([id]): LayoutChoice => ({ kind: 'preset', id }))
  const saved = settings.saved
    .filter((entry) => settings.arrangements[entry.id]?.mode === mode)
    .map((entry): LayoutChoice => ({ kind: 'saved', id: entry.id, name: entry.name }))
  return [...presets, ...saved]
}
