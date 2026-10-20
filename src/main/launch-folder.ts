import { isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * The folder to open from a command line such as `plotdevice ~/novels/salt-orchard`, or from a
 * file manager's "Open With" (which passes a `file://` address). `args` are the arguments after
 * the executable (and, unpackaged, after the app path). Flags are skipped; relative paths are
 * resolved from `cwd`. Whether the folder exists is checked later, like any chosen folder.
 */
export function launchFolder(args: readonly string[], cwd: string): string | undefined {
  const candidate = args.find((arg) => arg !== '' && !arg.startsWith('-'))
  if (candidate === undefined) return undefined
  if (candidate.startsWith('file://')) {
    try {
      return fileURLToPath(candidate)
    } catch {
      return undefined
    }
  }
  return isAbsolute(candidate) ? candidate : resolve(cwd, candidate)
}

/**
 * The arguments after the executable, and after the app's path when run unpackaged. A second
 * launch's arguments can have Chromium's switches before the app path, so the app path is the
 * first argument that isn't a switch, wherever it is.
 */
export function userArguments(argv: readonly string[], isPackaged: boolean): readonly string[] {
  const rest = argv.slice(1)
  if (isPackaged) return rest
  const appPath = rest.findIndex((arg) => !arg.startsWith('-'))
  return appPath === -1 ? rest : [...rest.slice(0, appPath), ...rest.slice(appPath + 1)]
}
