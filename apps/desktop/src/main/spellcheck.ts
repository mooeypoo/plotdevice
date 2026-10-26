import type { BrowserWindow, MenuItemConstructorOptions } from 'electron'
import { Menu } from 'electron'

/**
 * Spellcheck dictionaries for a project: its language, the interface language and English, so Hebrew
 * prose with English phrases is checked in both. Only dictionaries the system offers are chosen.
 */
export function spellcheckLanguages(projectLanguage: string, interfaceLocale: string, available: readonly string[]): string[] {
  const pick = (tag: string): string | undefined => {
    const lower = tag.toLowerCase()
    const base = lower.split('-')[0] ?? lower
    return (
      available.find((language) => language.toLowerCase() === lower) ??
      available.find((language) => language.toLowerCase().split('-')[0] === base)
    )
  }
  const chosen = [pick(projectLanguage), pick(interfaceLocale), pick('en-US')].filter(
    (language): language is string => language !== undefined,
  )
  return [...new Set(chosen)]
}

/** The right-click menu: spelling suggestions first, then the usual editing commands. */
export function enableSpellingMenu(window: BrowserWindow, translate: (key: string) => string): void {
  window.webContents.on('context-menu', (_event, params) => {
    const items: MenuItemConstructorOptions[] = params.dictionarySuggestions.map((suggestion) => ({
      label: suggestion,
      click: () => window.webContents.replaceMisspelling(suggestion),
    }))
    if (params.misspelledWord) {
      items.push(
        {
          label: translate('spelling-add'),
          click: () => window.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord),
        },
        { type: 'separator' },
      )
    }
    if (params.isEditable)
      items.push(
        { role: 'cut', label: translate('edit-cut') },
        { role: 'copy', label: translate('edit-copy') },
        { role: 'paste', label: translate('edit-paste') },
      )
    else if (params.selectionText) items.push({ role: 'copy', label: translate('edit-copy') })
    if (items.length > 0) Menu.buildFromTemplate(items).popup({ window })
  })
}
