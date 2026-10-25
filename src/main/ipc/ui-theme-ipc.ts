import { UI_THEME_CHANNELS } from '../../contract/channels'
import type { UiThemeService } from '../ui-theme'
import { handleTrusted } from './handle-trusted'

/** Registers the fixed, trusted theme channels; the service validates the theme. */
export function registerUiThemeIpc(service: UiThemeService): void {
  handleTrusted(UI_THEME_CHANNELS.get, () => Promise.resolve(service.current()))
  handleTrusted(UI_THEME_CHANNELS.set, (_event, args) =>
    service.set(args.length === 1 ? args[0] : undefined)
  )
}
