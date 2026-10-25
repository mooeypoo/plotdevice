/** One command in a menu. */
export interface MenuItem {
  readonly key: string
  readonly label: string
  readonly run: () => void
  /** Draws a line before this item, starting a new group. */
  readonly separator?: boolean
  /** The keyboard shortcut, shown at the item's end, such as "Ctrl+K". */
  readonly shortcut?: string
}
