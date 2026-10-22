import type { Component } from 'vue'
import type { MessageKey } from '../../../../i18n/translator'
import BinderView from '../../features/binder/BinderView.vue'
import CardStack from '../../features/cards/CardStack.vue'
import PeekLayer from '../../features/cards/PeekLayer.vue'
import CommandPalette from '../../features/palette/CommandPalette.vue'
import CastStrip from '../../features/cast/CastStrip.vue'
import SceneCard from '../../features/cast/SceneCard.vue'
import SplitPane from '../../features/split/SplitPane.vue'
import CodexView from '../../features/codex/CodexView.vue'
import EditorPane from '../../features/editor/EditorPane.vue'
import PropertiesView from '../../features/inspector/PropertiesView.vue'
import InteractionsView from '../../features/interactions/InteractionsView.vue'
import OutlinePanel from '../../features/outline/OutlinePanel.vue'
import OverviewView from '../../features/overview/OverviewView.vue'
import ReferencePanel from '../../features/reference/ReferencePanel.vue'
import TimelineView from '../../features/timeline/TimelineView.vue'
import WarningsView from '../../features/warnings/WarningsView.vue'
import ProjectOverview from '../../features/welcome/ProjectOverview.vue'
import type { ViewId } from '../model/view-catalog'
import { publishViewDirectory } from '../../app/view-directory'

/** How the shell shows a catalogued view: its title, icon and component. */
export interface ViewDescriptor {
  readonly id: ViewId
  readonly title: MessageKey
  /** A token the shell draws as the view's icon (W3). */
  readonly icon: string
  /** Renders with no props; it wires itself to the stores it needs. */
  readonly component: Component
}

const view = (id: ViewId, title: MessageKey, component: Component): ViewDescriptor => ({
  id,
  title,
  icon: id,
  component
})

/**
 * The views that exist so far. Features provide components; the shell reads them from here and
 * never imports a feature component itself. Views the catalog plans but no feature provides yet
 * (cards, cast, scene card, board) are absent, and the shell doesn't offer them.
 */
export const VIEW_REGISTRY: Partial<Readonly<Record<ViewId, ViewDescriptor>>> = {
  document: view('document', 'view-write', EditorPane),
  binder: view('binder', 'side-manuscript', BinderView),
  codex: view('codex', 'side-codex', CodexView),
  properties: view('properties', 'right-panel-properties', PropertiesView),
  outline: view('outline', 'right-panel-outline', OutlinePanel),
  reference: view('reference', 'right-panel-reference', ReferencePanel),
  overview: view('overview', 'view-overview', OverviewView),
  timeline: view('timeline', 'view-timeline', TimelineView),
  interactions: view('interactions', 'view-interactions', InteractionsView),
  warnings: view('warnings', 'warnings-heading', WarningsView),
  'card-stack': view('card-stack', 'cards-stack-title', CardStack),
  cast: view('cast', 'cast-label', CastStrip),
  'scene-card': view('scene-card', 'scene-card-title', SceneCard)
}

publishViewDirectory(VIEW_REGISTRY)

/** Layers drawn above every region once per project, such as the peek card. */
export const OVERLAYS: readonly Component[] = [PeekLayer, CommandPalette]

/** A read-only split beside the writable document; takes a `splitId` prop. */
export const SPLIT_PANE: Component = SplitPane

/** What the document view shows when no document is open: the project's home, with a `warnings` slot. */
export const PROJECT_HOME: Component = ProjectOverview

/** The registered view for `id`; a bug if a caller asks for one that isn't registered. */
export function registeredView(id: ViewId): ViewDescriptor {
  const descriptor = VIEW_REGISTRY[id]
  if (descriptor === undefined) throw new Error(`View not registered: ${id}`)
  return descriptor
}
