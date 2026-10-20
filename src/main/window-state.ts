import { z } from 'zod'
import { err, ok, type Result } from './shared-kernel/result'

const boundsSchema = z.object({
  x: z.number().int(),
  y: z.number().int(),
  width: z.number().int().positive(),
  height: z.number().int().positive()
})

const windowStateSchema = z.object({
  version: z.literal(1),
  bounds: boundsSchema,
  maximized: z.boolean()
})

/** Normal window geometry in screen coordinates, independent of Electron. */
export type WindowBounds = z.infer<typeof boundsSchema>

/** Per-user window geometry, with normal bounds retained while maximized. */
export type WindowState = z.infer<typeof windowStateSchema>

/** A settings failure that must be reported before falling back to the default window. */
export interface WindowStateError {
  readonly code: 'invalid-window-state' | 'read-window-state' | 'write-window-state'
  readonly message: string
}

/** Window settings live outside the novel and can be absent on first launch. */
export interface WindowStateStore {
  load(): Promise<Result<WindowState | undefined, WindowStateError>>
  save(state: WindowState): Promise<Result<void, WindowStateError>>
}

/** Validates untrusted saved settings without coercing malformed coordinates or flags. */
export function validateWindowState(value: unknown): Result<WindowState, WindowStateError> {
  const parsed = windowStateSchema.safeParse(value)
  return parsed.success
    ? ok(parsed.data)
    : err({ code: 'invalid-window-state', message: parsed.error.message })
}

/** True when the window overlaps at least one current display by a positive area. */
export function isOnAnyDisplay(bounds: WindowBounds, displays: readonly WindowBounds[]): boolean {
  return displays.some(
    (display) =>
      bounds.x < display.x + display.width &&
      bounds.x + bounds.width > display.x &&
      bounds.y < display.y + display.height &&
      bounds.y + bounds.height > display.y
  )
}
