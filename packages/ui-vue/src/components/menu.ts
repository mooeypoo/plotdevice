export interface MenuItem {
  key: string
  label: string
  run: () => void
  disabled?: boolean
  /** Starts a new group, with a divider before it. */
  group?: string
}
