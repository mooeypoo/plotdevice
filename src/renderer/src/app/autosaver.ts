/** Saves after a pause in typing, never runs two saves at once, and can be flushed on demand. */
export interface Autosaver {
  /** Something changed: save after the delay, restarting the wait. */
  schedule(): void
  /** Save now if anything is pending, and wait until every save has finished. */
  flush(): Promise<void>
  /** Drop a pending save (the text was discarded). */
  cancel(): void
}

/** Creates an autosaver around `save`, which saves whatever the current text is. */
export function createAutosaver(options: {
  readonly delayMs: number
  readonly save: () => Promise<void>
}): Autosaver {
  let timer: ReturnType<typeof setTimeout> | undefined
  let pending = false
  let running: Promise<void> | undefined

  const run = async (): Promise<void> => {
    while (pending) {
      pending = false
      await options.save()
    }
  }

  const start = (): Promise<void> => {
    if (running === undefined) {
      running = run().finally(() => {
        running = undefined
      })
    }
    return running
  }

  const clearTimer = (): void => {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
  }

  return {
    schedule() {
      pending = true
      clearTimer()
      timer = setTimeout(() => {
        timer = undefined
        void start()
      }, options.delayMs)
    },
    async flush() {
      clearTimer()
      await start()
    },
    cancel() {
      clearTimer()
      pending = false
    }
  }
}
