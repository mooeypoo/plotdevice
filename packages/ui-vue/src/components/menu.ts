import type { IconName } from './AppIcon.vue'

export interface MenuItem {
  key: string
  label: string
  run: () => void
  disabled?: boolean
  /** Starts a new group, with a divider before it. */
  group?: string
  /** A keyboard shortcut, shown beside the label. */
  hint?: string
  /** An icon before the label, where a picture helps (formatting). */
  icon?: IconName
}
