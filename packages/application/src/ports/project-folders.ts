import type { Result } from '@plotdevice/shared'
import type { FileStore } from './file-store'

export type CreateFolderProblem = 'exists' | 'inside-project' | 'io'

/** Where projects live on this device. */
export interface ProjectFolders {
  /**
   * Creates `name` inside `location`, with the given empty subfolders, refusing to overwrite a folder or
   * to nest inside another project. Returns the new project's root.
   */
  create(location: string, name: string, subfolders: readonly string[]): Promise<Result<string, CreateFolderProblem>>
  /** The store for the project whose folder is `root`. */
  open(root: string): FileStore
}
