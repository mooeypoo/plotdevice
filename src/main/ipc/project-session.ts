/**
 * The project that is open in the window, and the per-project use cases built for it. One window,
 * one project: opening another replaces it.
 */
export interface ProjectSession<UseCases> {
  current(): UseCases | undefined
  open(root: string, readOnly: boolean): void
  close(): void
}

/** Creates a session that builds use cases for each project as it opens. */
export function createProjectSession<UseCases>(
  build: (root: string, readOnly: boolean) => UseCases
): ProjectSession<UseCases> {
  let current: UseCases | undefined
  return {
    current: () => current,
    open: (root, readOnly) => {
      current = build(root, readOnly)
    },
    close: () => {
      current = undefined
    }
  }
}
