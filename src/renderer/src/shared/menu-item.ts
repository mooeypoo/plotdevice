/** One command in a menu. */
export interface MenuItem {
  readonly key: string
  readonly label: string
  readonly run: () => void
}
