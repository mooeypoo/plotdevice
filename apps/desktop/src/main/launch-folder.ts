import { isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * The folder Plot Device was asked to open, from its command line: an absolute path, or a `file://`
 * address as file managers send for "Open with". Switches and the app's own folder are skipped.
 * Whether it exists, and is a project, is checked by whoever opens it.
 */
export function folderFromArgs(argv: readonly string[], appPath: string): string | null {
  // After the executable come switches (from Electron, Chromium or test tools) and, in development,
  // the app's own folder; neither is the author's folder.
  for (const arg of argv.slice(1)) {
    if (arg.startsWith('-')) continue
    if (arg.startsWith('file://')) {
      try {
        return fileURLToPath(arg)
      } catch {
        continue
      }
    }
    if (isAbsolute(arg) && resolve(arg) !== resolve(appPath)) return arg
  }
  return null
}
