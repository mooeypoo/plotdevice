/** A box on screen in viewport pixels, such as the link a peek card belongs to. */
export interface ScreenRect {
  readonly left: number
  readonly right: number
  readonly top: number
  readonly bottom: number
}

/** The viewport box of an element. */
export function screenRectOf(element: Element): ScreenRect {
  const { left, right, top, bottom } = element.getBoundingClientRect()
  return { left, right, top, bottom }
}
