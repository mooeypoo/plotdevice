import type { ProjectPath } from '@plotdevice/shared'
import { watch } from 'chokidar'

export type FileChange = { kind: 'added' | 'changed' | 'removed'; path: ProjectPath }

export interface ProjectWatcher {
  /** Resolves once the initial scan is done and changes are being reported. */
  ready: Promise<void>
  close(): Promise<void>
}

/**
 * Reports changes to a project's Markdown files, from the app or any other program. Events are
 * hints only (ADR 0005): every read and write still checks revisions, so a missed or extra event
 * can't lose or overwrite anything. Hidden files and folders, including the app's own temporary
 * files, are ignored.
 */
export function watchProject(root: string, onChange: (change: FileChange) => void): ProjectWatcher {
  const watcher = watch(root, {
    cwd: root,
    ignoreInitial: true,
    ignored: [/(^|\/)\.[^/]/, (path, stats) => stats?.isFile() === true && !path.toLowerCase().endsWith('.md')],
  })
  const report = (kind: FileChange['kind']) => (path: string) => {
    if (path.toLowerCase().endsWith('.md')) onChange({ kind, path: path.replace(/\\/g, '/') as ProjectPath })
  }
  watcher.on('add', report('added')).on('change', report('changed')).on('unlink', report('removed'))
  watcher.on('error', (error) => console.warn('The project folder could not be watched:', error))
  const ready = new Promise<void>((resolve) => watcher.once('ready', () => resolve()))
  return { ready, close: () => watcher.close() }
}
