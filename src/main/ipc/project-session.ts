/**
 * The project that is open in the window, and the per-project use cases built for it. One window,
 * one project: opening another replaces it.
 */
export interface ProjectSession<UseCases, Context> {
  current(): UseCases | undefined
  open(root: string, context: Context): void
  close(): void
}

/** Creates a session that builds use cases for each project as it opens. */
export function createProjectSession<UseCases, Context>(
  build: (root: string, context: Context) => UseCases
): ProjectSession<UseCases, Context> {
  let current: UseCases | undefined
  return {
    current: () => current,
    open: (root, context) => {
      current = build(root, context)
    },
    close: () => {
      current = undefined
    }
  }
}
