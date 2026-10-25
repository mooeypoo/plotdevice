import { computed } from 'vue'
import type { MessageKey } from '../../../../i18n/translator'
import { uiDirection } from '../../../../i18n/locales'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useWorkbenchStore } from '../../app/workbench-store'
import { physicalEdge } from '../model/direction'
import { areaActions, sectionActions, type SectionAction } from '../model/placement-actions'
import type { ViewId } from '../model/view-catalog'
import type { AreaRegion } from '../model/vocabulary'
import { registeredView, VIEW_REGISTRY } from '../views/view-registry'
import type { MenuItem } from '../../shared/menu-item'

/** Views a writer can place in panels: every registered view except the document itself. */
function placeableViews(): ViewId[] {
  return Object.keys(VIEW_REGISTRY).filter((view): view is ViewId => view !== 'document')
}

/** Menu items for placing views, labelled in the interface language and by physical side. */
export function usePlacementMenus() {
  const workbench = useWorkbenchStore()
  const language = useUiLanguageStore()
  const direction = computed(() => uiDirection(language.locale))
  const title = (view: ViewId): string => language.t(registeredView(view).title)

  /** Docks are named by the side of the screen they're on, so the label is right in Hebrew too. */
  function moveLabel(region: AreaRegion): MessageKey {
    if (region === 'bottom') return 'workbench-move-bottom'
    return physicalEdge(region, direction.value) === 'left'
      ? 'workbench-move-left'
      : 'workbench-move-right'
  }

  function sectionLabel(action: SectionAction, view: ViewId): string {
    switch (action.kind) {
      case 'move':
        return language.t(moveLabel(action.region))
      case 'earlier':
        return language.t('workbench-move-earlier')
      case 'later':
        return language.t('workbench-move-later')
      case 'collapse':
        return language.t('workbench-section-collapse', title(view))
      case 'expand':
        return language.t('workbench-section-expand', title(view))
      case 'close':
        return language.t('workbench-section-close', title(view))
    }
  }

  function sectionMenu(sectionId: string, view: ViewId): MenuItem[] {
    return sectionActions(workbench.layout, sectionId).map((action) => ({
      key: action.kind === 'move' ? `move-${action.region}` : action.kind,
      label: sectionLabel(action, view),
      run: () => {
        workbench.apply(action.apply)
      }
    }))
  }

  function areaMenu(region: AreaRegion): MenuItem[] {
    return areaActions(workbench.layout, region, placeableViews()).map((action) => ({
      key: action.kind === 'add' ? `add-${action.view}` : action.kind,
      label:
        action.kind === 'add'
          ? language.t('workbench-add-view', title(action.view))
          : language.t(action.kind === 'tabs' ? 'workbench-show-tabs' : 'workbench-show-stacked'),
      run: () => {
        workbench.apply(action.apply)
      }
    }))
  }

  return { sectionMenu, areaMenu }
}
