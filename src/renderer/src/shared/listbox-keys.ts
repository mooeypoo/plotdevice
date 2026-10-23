import type { ScreenRect } from './screen-rect'
import type { SelectOption } from './select-option'

/** The next enabled option from `from` in `step` direction, wrapping never; `from` when none. */
export function nextEnabledIndex(
  options: readonly SelectOption[],
  from: number,
  step: 1 | -1
): number {
  for (let index = from + step; index >= 0 && index < options.length; index += step) {
    if (options[index]?.disabled !== true) return index
  }
  return from
}

/** The first enabled option, or the last when `fromEnd`; -1 when every option is disabled. */
export function edgeEnabledIndex(options: readonly SelectOption[], fromEnd: boolean): number {
  const start = fromEnd ? options.length : -1
  const found = nextEnabledIndex(options, start, fromEnd ? -1 : 1)
  return found === start ? -1 : found
}

/**
 * The option a typed prefix points to, searching after `from` and wrapping, so pressing the same
 * letter again cycles through the options that start with it. -1 when nothing matches.
 */
export function typeaheadIndex(
  options: readonly SelectOption[],
  prefix: string,
  from: number,
  locale: string
): number {
  const wanted = prefix.toLocaleLowerCase(locale)
  const first = wanted.charAt(0)
  const repeated = wanted.replaceAll(first, '') === ''
  const start = repeated ? from + 1 : from
  for (let offset = 0; offset < options.length; offset += 1) {
    const index = (start + offset + options.length) % options.length
    const option = options[index]
    if (option === undefined || option.disabled === true) continue
    const label = option.label.toLocaleLowerCase(locale)
    if (label.startsWith(repeated ? first : wanted)) return index
  }
  return -1
}

/** Where a list opens beside its trigger: below unless there is more room above. */
export interface ListPlacement {
  readonly top?: number
  readonly bottom?: number
  readonly left?: number
  readonly right?: number
  readonly minWidth: number
  readonly maxHeight: number
}

const GAP = 4
const MARGIN = 8
const LIST_HEIGHT = 320

/** Places a list against its trigger in the viewport, aligned to the trigger's inline start. */
export function placeList(
  trigger: ScreenRect,
  viewport: { readonly width: number; readonly height: number },
  rtl: boolean
): ListPlacement {
  const below = viewport.height - trigger.bottom - GAP - MARGIN
  const above = trigger.top - GAP - MARGIN
  const opensUp = below < Math.min(LIST_HEIGHT, above)
  const vertical = opensUp
    ? { bottom: viewport.height - trigger.top + GAP, maxHeight: Math.min(LIST_HEIGHT, above) }
    : { top: trigger.bottom + GAP, maxHeight: Math.min(LIST_HEIGHT, below) }
  const horizontal = rtl
    ? { right: Math.max(MARGIN, viewport.width - trigger.right) }
    : { left: Math.max(MARGIN, trigger.left) }
  return { ...vertical, ...horizontal, minWidth: trigger.right - trigger.left }
}
