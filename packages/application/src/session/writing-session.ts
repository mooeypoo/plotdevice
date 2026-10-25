import type { NewProject } from '@plotdevice/domain'
import { err, ok, type ProjectPath, type Result } from '@plotdevice/shared'
import { createChapterAutosave, type ChapterAutosave, type SaveStatus } from '../chapters/chapter-autosave'
import type { Revision } from '../ports/file-store'
import type { ChangeProblem, ContentsChange, CreateProblem, FileRenamed, OpenProblem, ProjectRepository, ProjectSnapshot, RenameFileProblem } from '../ports/project-repository'

export type SessionEvent =
  | { kind: 'save-status'; file: ProjectPath; status: SaveStatus }
  /** Changed elsewhere with no unsaved edits here: the editor shows the new text. */
  | { kind: 'chapter-reloaded'; file: ProjectPath; text: string; generation: number }
  | { kind: 'project-changed'; project: ProjectSnapshot }

/**
 * An open chapter's text. `generation` names this version of the text: saves typed into an older
 * one (the editor hadn't yet shown a reload) are held as a conflict, never written over the reload.
 */
export interface OpenedChapter {
  file: ProjectPath
  text: string
  generation: number
  status: SaveStatus
}

export type ConflictChoice = 'keep-both' | 'use-mine'
/** `text` is what the chapter now holds, or `null` if it was deleted elsewhere; `copy` is where "keep both" put the author's text. */
export interface ConflictResolved {
  copy: ProjectPath | null
  text: string | null
  generation: number
}
export type ResolveProblem = 'no-conflict' | 'missing' | 'changed-again' | 'write-failed'
export type NoProject = 'no-project'

export interface WritingSessionOptions {
  repository: ProjectRepository
  /** "my version" in the interface language, for the file and title of a kept copy. */
  copyLabel: () => string
}

/**
 * The open project and its open chapters, for one window. Chapter text is saved through one autosave
 * queue per chapter; changes to the project's structure run one at a time (ADR 0005).
 */
export interface WritingSession {
  project(): ProjectSnapshot | null
  onEvent(listener: (event: SessionEvent) => void): () => void
  /** Finishes saving the current project's chapters first. */
  openProject(root: string): Promise<Result<ProjectSnapshot, OpenProblem>>
  createProject(location: string, details: NewProject): Promise<Result<ProjectSnapshot, CreateProblem>>
  openChapter(file: ProjectPath): Promise<Result<OpenedChapter, NoProject | 'missing' | 'unreadable'>>
  saveChapter(file: ProjectPath, text: string, generation: number): Result<void, 'not-open'>
  saveStatus(file: ProjectPath): SaveStatus | null
  /** A hint that a file changed on disk, from the file watcher. */
  fileChanged(file: ProjectPath): Promise<void>
  /** Reads the project again after changes elsewhere (chapters added or removed, the contents edited). */
  refreshProject(): Promise<void>
  resolveConflict(file: ProjectPath, choice: ConflictChoice): Promise<Result<ConflictResolved, ResolveProblem>>
  changeContents(change: ContentsChange): Promise<Result<ProjectSnapshot, ChangeProblem | NoProject>>
  renameChapter(file: ProjectPath, title: string): Promise<Result<ProjectSnapshot, ChangeProblem | NoProject>>
  renameChapterFile(file: ProjectPath, newName: string): Promise<Result<FileRenamed, RenameFileProblem | NoProject>>
  /**
   * Runs `change` on a file outside its text, such as a page's title in its frontmatter. For an open
   * file it runs between saves, and saving continues from the revision it leaves, so it never looks
   * like a change made elsewhere.
   */
  updateFile<E>(file: ProjectPath, change: () => Promise<Result<void, E>>, options?: { reload?: boolean }): Promise<Result<void, E | NoProject | 'unreadable'>>
  /** Resolves once every change has been written. The app waits for this before quitting. */
  idle(): Promise<void>
}

interface OpenChapterState {
  file: ProjectPath
  generation: number
  autosave: ChapterAutosave
}

export function createWritingSession({ repository, copyLabel }: WritingSessionOptions): WritingSession {
  let project: ProjectSnapshot | null = null
  let chapters = new Map<ProjectPath, OpenChapterState>()
  const listeners = new Set<(event: SessionEvent) => void>()
  let operations: Promise<unknown> = Promise.resolve()

  const emit = (event: SessionEvent): void => {
    for (const listener of listeners) listener(event)
  }
  const setProject = (next: ProjectSnapshot): void => {
    project = next
    emit({ kind: 'project-changed', project: next })
  }
  /** Structural changes take turns, so two never start from the same snapshot. */
  const serially = <T>(work: () => Promise<T>): Promise<T> => {
    const result = operations.then(work)
    operations = result.catch(() => undefined)
    return result
  }
  const idleChapters = async (): Promise<void> => {
    await Promise.all([...chapters.values()].map((state) => state.autosave.idle()))
  }

  function track(root: string, file: ProjectPath, revision: Revision): OpenChapterState {
    const state: OpenChapterState = {
      file,
      generation: 1,
      autosave: createChapterAutosave(async (text, expected) => {
        const saved = await repository.saveChapter(root, state.file, text, expected)
        if (saved.ok) {
          rememberRevision(state.file, saved.value)
          return saved
        }
        // Missing or unreadable means it was changed elsewhere too: the author decides.
        return err(saved.error === 'write-failed' ? 'write-failed' : 'stale')
      }, revision),
    }
    state.autosave.onStatus((status) => emit({ kind: 'save-status', file: state.file, status }))
    chapters.set(file, state)
    return state
  }

  const rememberRevision = (file: ProjectPath, revision: Revision): void => {
    if (project) project = withRevision(project, file, revision)
  }

  function showReload(state: OpenChapterState, text: string, revision: Revision): void {
    state.autosave.reset(revision)
    state.generation++
    rememberRevision(state.file, revision)
    emit({ kind: 'chapter-reloaded', file: state.file, text, generation: state.generation })
  }

  async function reloadIfUnedited(state: OpenChapterState, root: string): Promise<void> {
    if (state.autosave.unsavedText() !== null) return // the next save meets the change and asks the author
    const disk = await repository.readChapter(root, state.file)
    const status = state.autosave.status()
    if (!disk.ok || status.kind !== 'saved' || disk.value.revision === status.revision) return
    showReload(state, disk.value.text, disk.value.revision)
  }

  /** The snapshot, with the revision each open chapter was last saved at: the snapshot may have been read mid-save. */
  function withOpenRevisions(snapshot: ProjectSnapshot): ProjectSnapshot {
    let current = snapshot
    for (const state of chapters.values()) {
      const status = state.autosave.status()
      if (status.kind === 'saved') current = withRevision(current, state.file, status.revision)
    }
    return current
  }

  async function switchProject<P>(open: () => Promise<Result<ProjectSnapshot, P>>): Promise<Result<ProjectSnapshot, P>> {
    await idleChapters()
    const opened = await open()
    if (opened.ok) {
      chapters = new Map()
      setProject(opened.value)
    }
    return opened
  }

  return {
    project: () => project,
    onEvent(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    openProject: (root) => serially(() => switchProject(() => repository.open(root))),
    createProject: (location, details) => serially(() => switchProject(() => repository.create(location, details))),

    async openChapter(file) {
      if (!project) return err('no-project')
      const state = chapters.get(file)
      const unsaved = state?.autosave.unsavedText() ?? null
      if (state && unsaved !== null) return ok({ file, text: unsaved, generation: state.generation, status: state.autosave.status() })
      const disk = await repository.readChapter(project.root, file)
      if (!disk.ok) return disk
      if (!state) {
        const opened = track(project.root, file, disk.value.revision)
        return ok({ file, text: disk.value.text, generation: opened.generation, status: opened.autosave.status() })
      }
      const status = state.autosave.status()
      if (status.kind === 'saved' && status.revision !== disk.value.revision) showReload(state, disk.value.text, disk.value.revision)
      return ok({ file, text: disk.value.text, generation: state.generation, status: state.autosave.status() })
    },

    saveChapter(file, text, generation) {
      const state = chapters.get(file)
      if (!state) return err('not-open')
      if (generation === state.generation) state.autosave.save(text)
      else state.autosave.conflict(text)
      return ok(undefined)
    },

    saveStatus: (file) => chapters.get(file)?.autosave.status() ?? null,

    async fileChanged(file) {
      const state = chapters.get(file)
      if (state && project) await reloadIfUnedited(state, project.root)
    },

    refreshProject: () =>
      serially(async () => {
        if (!project) return
        const reopened = await repository.open(project.root)
        if (!reopened.ok || reopened.value.root !== project?.root) return
        const next = withOpenRevisions(reopened.value)
        // The app's own saves change only revisions; nobody needs to hear about those.
        if (withoutRevisions(next) === withoutRevisions(project)) project = next
        else setProject(next)
      }),

    resolveConflict: (file, choice) =>
      serially(async (): Promise<Result<ConflictResolved, ResolveProblem>> => {
        const state = chapters.get(file)
        const status = state?.autosave.status()
        if (!project || !state || status?.kind !== 'conflict') return err('no-conflict')
        const { root } = project
        if (choice === 'use-mine') {
          const current = await repository.readChapter(root, file)
          if (!current.ok) return err('missing')
          const saved = await repository.saveChapter(root, file, status.unsaved, current.value.revision)
          if (!saved.ok) return err(saved.error === 'stale' ? 'changed-again' : saved.error === 'write-failed' ? 'write-failed' : 'missing')
          state.autosave.reset(saved.value)
          rememberRevision(file, saved.value)
          return ok({ copy: null, text: status.unsaved, generation: state.generation })
        }
        const copy = await repository.saveChapterCopy(root, file, status.unsaved, copyLabel())
        if (!copy.ok) return copy
        const theirs = await repository.readChapter(root, file)
        const reopened = await repository.open(root)
        if (reopened.ok) setProject(reopened.value)
        if (!theirs.ok) {
          chapters.delete(file)
          return ok({ copy: copy.value, text: null, generation: state.generation })
        }
        state.autosave.reset(theirs.value.revision)
        state.generation++
        rememberRevision(file, theirs.value.revision)
        return ok({ copy: copy.value, text: theirs.value.text, generation: state.generation })
      }),

    changeContents: (change) =>
      serially(async () => {
        if (!project) return err('no-project')
        const changed = await repository.changeContents(project, change)
        if (changed.ok) setProject(changed.value)
        return changed
      }),

    renameChapter: (file, title) =>
      serially(async () => {
        if (!project) return err('no-project')
        const current = project
        const state = chapters.get(file)
        if (!state) {
          const renamed = await repository.renameChapter(current, file, title)
          if (renamed.ok) setProject(renamed.value)
          return renamed
        }
        // The title is in the chapter's frontmatter, so it is written between saves of its text.
        return state.autosave.exclusive(async (revision): Promise<{ revision: Revision | null; value: Result<ProjectSnapshot, ChangeProblem> }> => {
          const renamed = await repository.renameChapter(withRevision(current, file, revision), file, title)
          if (!renamed.ok) return { revision: null, value: renamed }
          setProject(renamed.value)
          return { revision: renamed.value.chapters.find((c) => c.file === file)?.revision ?? null, value: renamed }
        })
      }),

    renameChapterFile: (file, newName) =>
      serially(async () => {
        if (!project) return err('no-project')
        await idleChapters()
        const current = withOpenRevisions(project)
        const renamed = await repository.renameChapterFile(current, file, newName)
        if (!renamed.ok) return renamed
        setProject(renamed.value.snapshot)
        const state = chapters.get(file)
        if (state) {
          chapters.delete(file)
          state.file = renamed.value.file
          chapters.set(state.file, state)
        }
        // Links inside open chapters may have been updated.
        for (const changed of renamed.value.filesChanged) {
          const open = chapters.get(changed)
          if (open) await reloadIfUnedited(open, current.root)
        }
        return renamed
      }),

    // With `reload`, the change replaced the text too (restoring a version): the editor shows the new text.
    updateFile<E>(file: ProjectPath, change: () => Promise<Result<void, E>>, options: { reload?: boolean } = {}) {
      return serially(async (): Promise<Result<void, E | NoProject | 'unreadable'>> => {
        if (!project) return err('no-project' as const)
        const { root } = project
        const state = chapters.get(file)
        if (!state) return change()
        return state.autosave.exclusive(async (): Promise<{ revision: Revision | null; value: Result<void, E | 'unreadable'> }> => {
          const changed = await change()
          if (!changed.ok) return { revision: null, value: changed }
          const disk = await repository.readChapter(root, file)
          if (!disk.ok) return { revision: null, value: err('unreadable' as const) }
          if (options.reload) showReload(state, disk.value.text, disk.value.revision)
          else rememberRevision(file, disk.value.revision)
          return { revision: disk.value.revision, value: ok(undefined) }
        })
      })
    },

    idle: async () => {
      await operations
      await idleChapters()
    },
  }
}

function withRevision(snapshot: ProjectSnapshot, file: ProjectPath, revision: Revision): ProjectSnapshot {
  return { ...snapshot, chapters: snapshot.chapters.map((chapter) => (chapter.file === file ? { ...chapter, revision } : chapter)) }
}

/** Everything about a snapshot that the author can see. */
function withoutRevisions(snapshot: ProjectSnapshot): string {
  return JSON.stringify({ ...snapshot, contentsRevision: null, chapters: snapshot.chapters.map((chapter) => ({ ...chapter, revision: null })) })
}
