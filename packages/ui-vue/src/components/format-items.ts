import type { FormatCommand } from '@plotdevice/editor-codemirror'
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
