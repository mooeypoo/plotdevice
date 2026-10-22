import { computed } from 'vue'
import type { MessageKey } from '../../../i18n/translator'
import { viewsIn } from '../workbench/model/layout'
import type { PresetId } from '../workbench/model/presets'
import { VIEW_CATALOG, type ViewId } from '../workbench/model/view-catalog'
import { layoutChoices, layoutFor } from '../workbench/model/workbench-settings'
import { formatEntryPlaceLabel } from '../shared/entry-place-label'
import { useChromePresentation } from '../shared/use-chrome-presentation'
import { useCodexStore } from './codex-store'
import { useEditorStore } from './editor-store'
import { placeOf } from './entry-owners'
import { useCaptureStore } from './capture-store'
import { useLayoutStore, type MainView } from './layout-store'
import { useOutlineStore } from './outline-store'
import { usePaletteStore } from './palette-store'
import { useWritingPreferencesStore } from './writing-preferences-store'
import { useManuscriptStore } from './manuscript-store'
import { useReferenceStore } from './reference-store'
import { useUiLanguageStore } from './ui-language-store'
import { useWorkbenchNavigation } from './use-workbench-navigation'
import { viewDirectory } from './view-directory'
import { useWorkbenchStore } from './workbench-store'

/** What a palette item does, which also groups and labels it. */
export type PaletteKind = 'entry' | 'view' | 'layout' | 'command'

/** One thing the palette can do. */
export interface PaletteItem {
  readonly id: string
  readonly kind: PaletteKind
  /** The name the writer types to find it. */
  readonly title: string
  readonly aliases?: readonly string[]
  /** Shown beside the title: an entry's place, or the item's kind. */
  readonly detail: string
  /** For entries: the file, so the palette can put open documents first. */
  readonly path?: string
  /** Runs the command; a promise when it waits for navigation, so focus is settled after it. */
  readonly run: () => unknown
  /** Shift+Enter: show an entry beside the editor instead. */
  readonly runBeside?: () => unknown
}

const CENTER_VIEWS: readonly MainView[] = ['write', 'overview', 'timeline', 'interactions']
const CENTER_TITLES: Readonly<Record<MainView, MessageKey>> = {
  write: 'view-write',
  overview: 'view-overview',
  timeline: 'view-timeline',
  interactions: 'view-interactions',
  'plot-board': 'view-board'
}
const PRESET_NAMES: Readonly<Record<PresetId, MessageKey>> = {
  write: 'workbench-layout-write',
  revise: 'workbench-layout-revise',
  plot: 'workbench-layout-plot'
}
const CODEX_KINDS = new Set(['character', 'location', 'note'])
/** Other names the interface uses for a view, so typing either finds it. */
const VIEW_ALIASES: Partial<Readonly<Record<ViewId, readonly MessageKey[]>>> = {
  binder: ['chrome-binder'],
  properties: ['chrome-inspector']
}

/**
 * Everything the palette offers: the project's entries, views, layouts and the menu's commands.
 * Each runs through the same navigation as the rest of the app, with the same guards.
 */
export function usePaletteCommands() {
  const manuscript = useManuscriptStore()
  const codex = useCodexStore()
  const editor = useEditorStore()
  const reference = useReferenceStore()
  const layout = useLayoutStore()
  const workbench = useWorkbenchStore()
  const navigation = useWorkbenchNavigation()
  const language = useUiLanguageStore()
  const chrome = useChromePresentation()
  const preferences = useWritingPreferencesStore()
  const outlines = useOutlineStore()

  const entries = computed((): PaletteItem[] => {
    const aliases = new Map(
      (codex.listing?.entries ?? []).map((entry) => [entry.path, entry.aliases])
    )
    return (manuscript.manuscript?.linkTargets ?? []).flatMap((target): PaletteItem[] => {
      const place = placeOf(target.path)
      if (place === undefined) return []
      const consult = CODEX_KINDS.has(place.kind)
      return [
        {
          id: `entry:${target.path}`,
          kind: 'entry',
          title: place.title,
          aliases: [target.name, ...(aliases.get(target.path) ?? [])],
          detail: formatEntryPlaceLabel(place.label, language.t, chrome.formatNumber),
          path: target.path,
          // Codex entries are looked up in Reference, as the side panel does.
          run: () => {
            if (!consult) return editor.open(target.path)
            reference.open(target.path)
            return undefined
          },
          runBeside: () => navigation.openBeside(target.path)
        }
      ]
    })
  })

  const views = computed((): PaletteItem[] => {
    const kind = language.t('palette-kind-view')
    const center = CENTER_VIEWS.map((view): PaletteItem => ({
      id: `center:${view}`,
      kind: 'view',
      title: language.t(CENTER_TITLES[view]),
      detail: kind,
      run: () => navigation.showCenterView(view)
    }))
    const panels = (Object.keys(viewDirectory()) as ViewId[])
      .filter((view) => !VIEW_CATALOG[view].regions.includes('center'))
      .map((view): PaletteItem => {
        const descriptor = viewDirectory()[view]
        return {
          id: `view:${view}`,
          kind: 'view',
          title: language.t(
            'workbench-show-view',
            descriptor ? language.t(descriptor.title) : view
          ),
          aliases: (VIEW_ALIASES[view] ?? []).map((key) => language.t(key)),
          detail: kind,
          run: () => {
            navigation.revealView(view)
          }
        }
      })
    return [...center, ...panels]
  })

  const layouts = computed((): PaletteItem[] =>
    layoutChoices(workbench.settings, workbench.mode)
      .filter((choice) => {
        const arrangement = layoutFor(workbench.settings, choice.id)
        return (
          arrangement !== undefined &&
          viewsIn(arrangement).every((view) => viewDirectory()[view] !== undefined)
        )
      })
      .map((choice): PaletteItem => {
        const name =
          choice.kind === 'preset' ? language.t(PRESET_NAMES[choice.id as PresetId]) : choice.name
        return {
          id: `layout:${choice.id}`,
          kind: 'layout',
          title: language.t('palette-use-layout', name),
          aliases: [name],
          detail: language.t('palette-kind-layout'),
          run: () => navigation.switchLayout(choice.id)
        }
      })
  )

  const commands = computed((): PaletteItem[] => {
    const kind = language.t('palette-kind-command')
    const command = (id: string, title: MessageKey, run: () => unknown): PaletteItem => ({
      id: `command:${id}`,
      kind: 'command',
      title: language.t(title),
      detail: kind,
      run
    })
    const modes =
      workbench.shell !== 'workbench'
        ? []
        : workbench.mode === 'writing'
          ? [
              command('mode-plotting', 'palette-mode-plotting', () =>
                navigation.switchMode('plotting')
              )
            ]
          : [
              command('mode-writing', 'palette-mode-writing', () =>
                navigation.switchMode('writing')
              ),
              command('show-board', 'view-board', () => navigation.showCenterView('plot-board')),
              command('show-outline-text', 'palette-outline-text', () =>
                navigation.showOutlineText()
              )
            ]
    const capture =
      preferences.captureBeats && outlines.currentPath !== null
        ? [
            command('capture-beat', 'palette-capture', () => {
              useCaptureStore().show(usePaletteStore().origin())
            })
          ]
        : []
    return [
      ...capture,
      ...modes,
      command('return-to-writing', 'tabs-return', () => editor.returnToWriting()),
      command('toggle-binder', 'menu-toggle-binder', layout.toggleBinder),
      command('toggle-inspector', 'menu-toggle-inspector', layout.toggleInspector),
      command('toggle-outline', 'menu-toggle-outline', layout.toggleOutline),
      command('toggle-focus-mode', 'menu-focus', layout.toggleFocusMode),
      command('toggle-classic-layout', 'menu-classic-layout', () => {
        workbench.setShell(workbench.shell === 'classic' ? 'workbench' : 'classic')
      })
    ]
  })

  /** Every item, in the order ties are shown: entries, views, layouts, commands. */
  const items = computed(() => [
    ...entries.value,
    ...views.value,
    ...layouts.value,
    ...commands.value
  ])

  return { items, entries, views, layouts, commands }
}
