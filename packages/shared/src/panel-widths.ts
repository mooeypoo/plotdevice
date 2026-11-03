/** How wide the author may drag each side panel, in CSS pixels: the chapters list and the references shelf. */
export const PANEL_WIDTHS = {
  navigatorWidth: { min: 192, max: 480, initial: 272 },
  shelfWidth: { min: 240, max: 720, initial: 336 },
} as const

export type PanelWidthSetting = keyof typeof PANEL_WIDTHS
