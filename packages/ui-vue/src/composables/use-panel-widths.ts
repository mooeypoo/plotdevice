import { PANEL_WIDTHS, type PanelWidthSetting } from '@plotdevice/shared'
import { computed, reactive, type ComputedRef } from 'vue'
import { useSettingsStore } from '../stores/settings'

/** A width being dragged right now: shown at once, and saved only when the drag ends. */
const dragging = reactive<Record<PanelWidthSetting, number | null>>({ navigatorWidth: null, shelfWidth: null })

/** The side panels' widths, as CSS variables for a layout, and the way a resize handle changes them. */
export function usePanelWidths(): {
  width: (setting: PanelWidthSetting) => number
  style: ComputedRef<Record<string, string>>
  resize: (setting: PanelWidthSetting, width: number, save: boolean) => void
} {
  const settings = useSettingsStore()
  const width = (setting: PanelWidthSetting): number =>
    dragging[setting] ?? settings.preferences?.[setting] ?? PANEL_WIDTHS[setting].initial
  const style = computed(() => ({
    '--navigator-width': `${width('navigatorWidth')}px`,
    '--shelf-width': `${width('shelfWidth')}px`,
  }))

  function resize(setting: PanelWidthSetting, value: number, save: boolean): void {
    const { min, max } = PANEL_WIDTHS[setting]
    const next = Math.round(Math.min(max, Math.max(min, value)))
    if (!save) {
      dragging[setting] = next
      return
    }
    dragging[setting] = null
    if (next !== settings.preferences?.[setting]) void settings.update({ [setting]: next })
  }

  return { width, style, resize }
}
