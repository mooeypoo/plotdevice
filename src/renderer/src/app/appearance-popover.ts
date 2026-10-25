/** The id of the Appearance popover, which the ⋯ menu and Go to… open. */
export const APPEARANCE_POPOVER_ID = 'writing-appearance'

/** Opens the Appearance popover, if it is on screen; already open, it stays open. */
export function openAppearance(): void {
  document.getElementById(APPEARANCE_POPOVER_ID)?.togglePopover(true)
}
