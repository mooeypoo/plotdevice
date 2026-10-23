/** One command in a menu, or a submenu of more. */
export interface MenuItem {
  readonly key: string
  readonly label: string
  readonly run: () => void
  /** Draws a line before this item, starting a new group. */
  readonly separator?: boolean
  /** The keyboard shortcut, shown at the item's end, such as "Ctrl+K". */
  readonly shortcut?: string
  /** One of a set of choices: whether it is the chosen one. Makes the item a radio item. */
  readonly checked?: boolean
  /** Shown but not chosen, such as a note inside a menu. */
  readonly disabled?: boolean
  /** Opens a submenu of these items instead of running. */
  readonly children?: readonly MenuItem[]
}
