import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAutosaver } from './autosaver'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('createAutosaver', () => {
  it('saves once, after the writer pauses', async () => {
    const save = vi.fn(() => Promise.resolve())
    const autosaver = createAutosaver({ delayMs: 800, save })

    autosaver.schedule()
    await vi.advanceTimersByTimeAsync(500)
    autosaver.schedule()
    await vi.advanceTimersByTimeAsync(500)
    expect(save).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(300)
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('saves immediately on flush, and not again when the timer would have fired', async () => {
    const save = vi.fn(() => Promise.resolve())
    const autosaver = createAutosaver({ delayMs: 800, save })

    autosaver.schedule()
    await autosaver.flush()
    expect(save).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1000)
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('does nothing on flush when nothing changed', async () => {
    const save = vi.fn(() => Promise.resolve())
    await createAutosaver({ delayMs: 800, save }).flush()
    expect(save).not.toHaveBeenCalled()
  })

  it('never runs two saves at once, and saves again for edits made during a save', async () => {
    let finishFirst: () => void = () => undefined
    let active = 0
    let maxActive = 0
    const save = vi.fn(async () => {
      active += 1
      maxActive = Math.max(maxActive, active)
      if (save.mock.calls.length === 1)
        await new Promise<void>((resolve) => (finishFirst = resolve))
      active -= 1
    })
    const autosaver = createAutosaver({ delayMs: 800, save })

    autosaver.schedule()
    const flushing = autosaver.flush()
    autosaver.schedule()
    const flushingAgain = autosaver.flush()
    finishFirst()
    await Promise.all([flushing, flushingAgain])

    expect(save).toHaveBeenCalledTimes(2)
    expect(maxActive).toBe(1)
  })

  it('drops a pending save on cancel', async () => {
    const save = vi.fn(() => Promise.resolve())
    const autosaver = createAutosaver({ delayMs: 800, save })
    autosaver.schedule()
    autosaver.cancel()
    await vi.advanceTimersByTimeAsync(1000)
    await autosaver.flush()
    expect(save).not.toHaveBeenCalled()
  })
})
