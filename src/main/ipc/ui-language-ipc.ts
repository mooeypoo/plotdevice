import { UI_LANGUAGE_CHANNELS } from '../../contract/channels'
import type { UiLanguageService } from '../ui-language'
import { handleTrusted } from './handle-trusted'

/** Registers only fixed, trusted language channels; locale validation lives in the service. */
export function registerUiLanguageIpc(service: UiLanguageService): void {
  handleTrusted(UI_LANGUAGE_CHANNELS.get, () => Promise.resolve(service.current()))
  handleTrusted(UI_LANGUAGE_CHANNELS.set, (_event, args) =>
    service.set(args.length === 1 ? args[0] : undefined)
  )
}
