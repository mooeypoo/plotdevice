import { resolve } from 'node:path'
import type { ProjectRoot } from '../domain/project-root'

/** Turns a folder path from the OS (a dialog, the recents file) into a normalized `ProjectRoot`. */
export function projectRootFromOsPath(osPath: string): ProjectRoot {
  return resolve(osPath) as ProjectRoot
}
