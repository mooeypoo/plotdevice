import { EventEmitter } from 'node:events'
import { describe, expect, it, vi } from 'vitest'
import { err, ok } from './shared-kernel/result'
import { rememberWindow } from './remember-window'
import type { WindowState, WindowStateError, WindowStateStore } from './window-state'

function setup() {
  const events = new EventEmitter()
  let maximized = false
  let minimized = false
  let destroyed = false
  const normalBounds = { x: 100, y: 50, width: 1200, height: 800 }
  const window = {
    on: events.on.bind(events),
    getNormalBounds: () => normalBounds,
    isMaximized: () => maximized,
    isMinimized: () => minimized,
    isDestroyed: () => destroyed,
    close: vi.fn()
  }
  const save = vi.fn<WindowStateStore['save']>().mockResolvedValue(ok(undefined))
  const store: WindowStateStore = { load: () => Promise.resolve(ok(undefined)), save }
  const reportError = vi.fn<(error: WindowStateError) => void>()
  rememberWindow(window, store, reportError)
  const close = (alreadyPrevented = false) => {
    const event = {
      defaultPrevented: alreadyPrevented,
      preventDefault() {
        this.defaultPrevented = true
      }
    }
    events.emit('close', event)
    return event
  }
  return {
    window,
    events,
    normalBounds,
    save,
    reportError,
    close,
    maximize: () => {
      maximized = true
      events.emit('maximize')
    },
    minimize: () => {
      minimized = true
      maximized = false
    },
    unmaximize: () => {
      maximized = false
      events.emit('unmaximize')
    },
    destroy: () => {
      destroyed = true
    }
  }
}

describe('rememberWindow', () => {
  it('waits for the renderer close guard before saving anything', () => {
    const test = setup()
    test.close(true)
    expect(test.save).not.toHaveBeenCalled()
    expect(test.window.close).not.toHaveBeenCalled()
  })

  it('waits for the atomic save before closing and permits the final close', async () => {
    const test = setup()
    let finish: (() => void) | undefined
    test.save.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = () => {
            resolve(ok(undefined))
          }
        })
    )
    expect(test.close().defaultPrevented).toBe(true)
    test.close()
    expect(test.save).toHaveBeenCalledExactlyOnceWith({
      version: 1,
      bounds: test.normalBounds,
      maximized: false
    })
    expect(test.window.close).not.toHaveBeenCalled()
    finish?.()
    await Promise.resolve()
    expect(test.window.close).toHaveBeenCalledOnce()
    expect(test.close().defaultPrevented).toBe(false)
  })

  it('saves normal bounds rather than maximized geometry', async () => {
    const test = setup()
    test.maximize()
    test.close()
    await Promise.resolve()
    expect(test.save).toHaveBeenCalledWith({
      version: 1,
      bounds: test.normalBounds,
      maximized: true
    })
  })

  it('remembers maximized state while minimized, even after an unmaximize event', () => {
    const test = setup()
    test.maximize()
    test.minimize()
    test.unmaximize()
    test.close()
    expect(test.save.mock.calls[0]?.[0].maximized).toBe(true)
  })

  it('remembers returning to a normal window', () => {
    const test = setup()
    test.maximize()
    test.unmaximize()
    test.close()
    expect(test.save.mock.calls[0]?.[0].maximized).toBe(false)
  })

  it('reports save failures explicitly and still lets the writer close', async () => {
    const test = setup()
    const error: WindowStateError = { code: 'write-window-state', message: 'Disk full' }
    test.save.mockResolvedValue(err(error))
    test.close()
    await Promise.resolve()
    expect(test.reportError).toHaveBeenCalledWith(error)
    expect(test.window.close).toHaveBeenCalledOnce()
  })

  it('does not close a window destroyed during the save', async () => {
    const test = setup()
    test.close()
    test.destroy()
    await Promise.resolve()
    expect(test.window.close).not.toHaveBeenCalled()
  })

  it('captures a complete snapshot before an asynchronous save', () => {
    const test = setup()
    test.close()
    const state: WindowState | undefined = test.save.mock.calls[0]?.[0]
    expect(state).toEqual({
      version: 1,
      bounds: test.normalBounds,
      maximized: false
    })
  })
})
