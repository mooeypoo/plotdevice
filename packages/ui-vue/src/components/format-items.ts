import type { EditorMode, FormatCommand } from '@plotdevice/editor-codemirror'
import type { IconName } from './AppIcon.vue'
import type { MenuItem } from './menu'

/** Heading keys as in Word and Google Docs (Milestone 16, decision 6); Ctrl+0 stays Reset zoom. */
export const headingKeys = (level: number): string => (navigator.platform.startsWith('Mac') ? `⌘⌥${level}` : `Ctrl+Alt+${level}`)

const iconFor = (command: FormatCommand): IconName =>
  command.startsWith('heading') ? 'heading' : command === 'body' ? 'pilcrow' : (command as IconName)

const levelOf = (command: FormatCommand): number | null =>
  command.startsWith('heading') ? Number(command.slice(-1)) : command === 'body' ? 0 : null

/** One formatting command as a menu item, with its icon and, for headings, its keys. */
export function formatItem(t: (key: string) => string, command: FormatCommand, run: () => void, group?: string): MenuItem {
  const level = levelOf(command)
  return {
    key: `format-${command}`,
    label: t(`format-${command}`),
    icon: iconFor(command),
    run,
    ...(level === null ? {} : { hint: headingKeys(level) }),
    ...(group ? { group } : {}),
  }
}

/** Heading levels and body text, for the bubble's ⋯ and the ¶ menu. */
export const HEADING_COMMANDS = ['heading1', 'heading2', 'heading3', 'body'] as const

/** Plain text and back, from the editor (Ctrl+Shift+M, ⌘⇧M). By key position, so it works in a Hebrew layout too. */
export const plainTextKeys = (): string => (navigator.platform.startsWith('Mac') ? '⌘⇧M' : 'Ctrl+Shift+M')
export const isPlainTextKey = (event: KeyboardEvent): boolean =>
  (event.ctrlKey || event.metaKey) && event.shiftKey && !event.altKey && event.code === 'KeyM'

/** The niqqud picker (ADR 0013), from the editor (Ctrl+Shift+N, ⌘⇧N). By key position, so it works in a Hebrew layout. */
export const niqqudKeys = (): string => (navigator.platform.startsWith('Mac') ? '⌘⇧N' : 'Ctrl+Shift+N')
export const isNiqqudKey = (event: KeyboardEvent): boolean =>
  (event.ctrlKey || event.metaKey) && event.shiftKey && !event.altKey && event.code === 'KeyN'

/** "Niqqud…" in the Format menu: opens the picker on the letter before the cursor. */
export function niqqudItem(t: (key: string) => string, open: () => void): MenuItem {
  return { key: 'niqqud', label: t('niqqud-menu'), icon: 'niqqud', hint: niqqudKeys(), group: 'niqqud', run: open }
}

/** Plain text, or back to normal view, as the Format menu's last item, with its keys (ADR 0010). */
export function plainTextItem(t: (key: string) => string, mode: EditorMode, setMode: (mode: EditorMode) => void): MenuItem {
  return mode === 'plain'
    ? { key: 'plain-text-back', label: t('plain-text-back'), group: 'mode', hint: plainTextKeys(), run: () => setMode('rendered') }
    : { key: 'plain-text-edit', label: t('plain-text-edit'), group: 'mode', hint: plainTextKeys(), run: () => setMode('plain') }
}
