import { describe, expect, it } from 'vitest'
import { menuPlacement } from './menu-placement'

const screen = { width: 1440, height: 900 }
const menu = { width: 240, height: 300 }
const button = (top: number, left = 600) => ({ top, bottom: top + 32, left, right: left + 32 })
const ltr = { align: 'start' as const, rtl: false }

describe('where a menu opens', () => {
  it('below its button when it fits, lined up with its start edge', () => {
    expect(menuPlacement(button(100), menu, screen, ltr)).toEqual({ top: 138, left: 600, maxHeight: 754, above: false })
  })

  it('above when there is more room above, ending just over the button', () => {
    const placed = menuPlacement(button(700), menu, screen, ltr)
    expect(placed).toMatchObject({ above: true, top: 700 - 6 - 300 })
  })

  it('on the side with more room, scrolling, when it fits on neither', () => {
    const tall = { width: 240, height: 2000 }
    expect(menuPlacement(button(300), tall, screen, ltr)).toEqual({ top: 338, left: 600, maxHeight: 554, above: false })
    expect(menuPlacement(button(600), tall, screen, ltr)).toEqual({ top: 8, left: 600, maxHeight: 586, above: true })
  })

  it('mirrors in right-to-left, and with align end', () => {
    expect(menuPlacement(button(100), menu, screen, { align: 'start', rtl: true }).left).toBe(632 - 240)
    expect(menuPlacement(button(100), menu, screen, { align: 'end', rtl: false }).left).toBe(632 - 240)
    expect(menuPlacement(button(100), menu, screen, { align: 'end', rtl: true }).left).toBe(600)
  })

  it('stays inside the window at its sides', () => {
    expect(menuPlacement(button(100, 1400), menu, screen, ltr).left).toBe(1440 - 8 - 240)
    expect(menuPlacement(button(100, 2), menu, screen, { align: 'end', rtl: false }).left).toBe(8)
  })
})
