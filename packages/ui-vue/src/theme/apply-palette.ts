import { cssVariables, type Palette } from './tokens'

/**
 * Applies a palette as CSS variables on the root element. Uses the CSSOM (`style.setProperty`), which
 * the strict Content-Security-Policy allows, unlike `<style>` elements or style attributes in markup.
 */
export function applyPalette(root: HTMLElement, palette: Palette): void {
  for (const [name, value] of Object.entries(cssVariables(palette))) root.style.setProperty(name, value)
}
