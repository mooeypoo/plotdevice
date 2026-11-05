import { applyOutlineEdit, lineUpTarget, sectionAnchors, type Outline, type OutlineEdit } from '@plotdevice/domain'
import { err, ok, type ProjectPath, type Result } from '@plotdevice/shared'
import type { Revision } from '../ports/file-store'
import type { OutlineDocument, OutlineRepository, OutlineSummary, OutlineWriteProblem } from '../ports/outline-repository'

/** An open outline, and whether the author's last edit to it can be undone. */
export interface OutlineState extends OutlineDocument {
  canUndo: boolean
}

/** Sent when an open outline was changed by another program and has been read again. */
export type OutlineEvent = { kind: 'outline-changed'; file: ProjectPath; document: OutlineState }

/**
 * `changed-elsewhere`: the file changed in another program; the outline was reloaded and nothing was written.
 * `same-outline`: a section can only be lined up with another outline (ADR 0012).
 */
export type OutlineEditFailure = Exclude<OutlineWriteProblem, 'stale'> | 'changed-elsewhere' | 'no-project' | 'not-open' | 'same-outline'
export type UndoFailure = 'nothing-to-undo' | 'changed-elsewhere' | 'no-project' | 'not-open' | 'missing' | 'unreadable' | 'write-failed'

export interface OutlineSessionOptions {
  repository: OutlineRepository
  /** The open project's folder, or `null` when none is open. */
  root: () => string | null
}

/**
 * The project's outlines while the app runs. Edits to one outline run one at a time, each from the
 * revision the previous one left; the domain rules are checked before anything is written; a file
 * changed elsewhere is never written over (ADR 0005). Undo lives in memory only.
 */
export interface OutlineSession {
  list(): Promise<OutlineSummary[]>
  create(
    title: string,
    about?: ProjectPath,
    starter?: string,
  ): Promise<Result<OutlineState, 'no-project' | 'empty-text' | 'multiline-text' | 'write-failed'>>
  open(file: ProjectPath): Promise<Result<OutlineState, 'no-project' | 'missing' | 'unreadable'>>
  current(file: ProjectPath): OutlineState | null
  edit(file: ProjectPath, edit: OutlineEdit): Promise<Result<OutlineState, OutlineEditFailure>>
  undo(file: ProjectPath): Promise<Result<OutlineState, UndoFailure>>
  /** A hint from the file watcher. */
  fileChanged(file: ProjectPath): Promise<void>
  onEvent(listener: (event: OutlineEvent) => void): () => void
  /** Another project opened: forget open outlines and their undo history. */
  reset(): void
  idle(): Promise<void>
}

interface Open {
  document: OutlineDocument
  /** Each entry: the whole text before an edit, and the revision that edit left. */
  undo: { previous: string; after: Revision }[]
  queue: Promise<unknown>
}

export function createOutlineSession({ repository, root }: OutlineSessionOptions): OutlineSession {
  let open = new Map<ProjectPath, Open>()
  const listeners = new Set<(event: OutlineEvent) => void>()

  const stateOf = (entry: Open): OutlineState => ({ ...entry.document, canUndo: entry.undo.length > 0 })

  /** One change at a time per outline. */
  const serially = <T>(entry: Open, work: () => Promise<T>): Promise<T> => {
    const result = entry.queue.then(work)
    entry.queue = result.catch(() => undefined)
    return result
  }

  /**
   * After a section of `file` was renamed (or the rename undone), points the line-ups in other outlines
   * that meant that section at its new anchor (ADR 0012). Each file is edited like any other, from its
   * own revision; one changed elsewhere is left alone, and its line-up shows as "can't line up".
   */
  async function followRename(projectRoot: string, file: ProjectPath, before: Outline, after: Outline): Promise<void> {
    if (renamedSection(before, after) === null) return
    const anchors = sectionAnchors(after)
    for (const { file: other } of await repository.listOutlines(projectRoot)) {
      if (other === file) continue
      const entry = open.get(other)
      const update = async (): Promise<void> => {
        const read = await repository.readOutline(projectRoot, other)
        if (!read.ok) return
        let document = read.value
        for (const [index, section] of document.outline.sections.entries()) {
          const lineUp = section.lineUp
          if (lineUp?.outline !== file) continue
          const target = lineUpTarget(before, lineUp.anchor)
          const anchor = target === null ? null : anchors[target]
          const name = target === null ? null : after.sections[target]?.name
          if (target === null || !anchor || !name || lineUpTarget(after, lineUp.anchor) === target) continue
          const edit: OutlineEdit = { kind: 'line-up-section', section: index, lineUp: { outline: file, anchor, text: name }, words: '' }
          const written = await repository.editOutline(projectRoot, other, edit, document.revision, document.nestingUnit)
          if (!written.ok) return
          document = written.value.document
        }
        if (!entry || document.revision === read.value.revision) return
        // Its own undo would now be refused, so it isn't offered.
        entry.undo = []
        entry.document = { ...document, nestingUnit: document.nestingUnit ?? entry.document.nestingUnit }
        for (const listener of listeners) listener({ kind: 'outline-changed', file: other, document: stateOf(entry) })
      }
      await (entry ? serially(entry, update) : update())
    }
  }

  /** Reads the file again after a change elsewhere and tells the interface. */
  async function reload(projectRoot: string, file: ProjectPath, entry: Open): Promise<void> {
    const fresh = await repository.readOutline(projectRoot, file)
    if (!fresh.ok || fresh.value.revision === entry.document.revision) return
    entry.document = { ...fresh.value, nestingUnit: fresh.value.nestingUnit ?? entry.document.nestingUnit }
    for (const listener of listeners) listener({ kind: 'outline-changed', file, document: stateOf(entry) })
  }

  return {
    list: async () => {
      const projectRoot = root()
      return projectRoot ? repository.listOutlines(projectRoot) : []
    },

    async create(title, about, starter) {
      const projectRoot = root()
      if (!projectRoot) return err('no-project')
      const created = await repository.createOutline(projectRoot, title, about, starter)
      if (!created.ok) return created
      const entry: Open = { document: created.value, undo: [], queue: Promise.resolve() }
      open.set(created.value.file, entry)
      return ok(stateOf(entry))
    },

    async open(file) {
      const projectRoot = root()
      if (!projectRoot) return err('no-project')
      const known = open.get(file)
      const read = await repository.readOutline(projectRoot, file)
      if (!read.ok) return read
      if (known && known.document.revision === read.value.revision) return ok(stateOf(known))
      // Changed since (in the Text view, or another program): undo would be refused, so it isn't offered.
      const entry: Open = { document: read.value, undo: [], queue: known?.queue ?? Promise.resolve() }
      open.set(file, entry)
      return ok(stateOf(entry))
    },

    current: (file) => {
      const entry = open.get(file)
      return entry ? stateOf(entry) : null
    },

    async edit(file, edit) {
      const entry = open.get(file)
      if (!entry) return err('not-open' as const)
      if (edit.kind === 'line-up-section' && edit.lineUp.outline === file) return err('same-outline')
      const before = entry.document.outline
      const result = await serially(entry, async (): Promise<Result<OutlineState, OutlineEditFailure>> => {
        const projectRoot = root()
        if (!projectRoot) return err('no-project')
        // The rules first: a refused edit never reaches the file.
        const allowed = applyOutlineEdit(entry.document.outline, edit)
        if (!allowed.ok) return allowed
        const { revision, nestingUnit } = entry.document
        const written = await repository.editOutline(projectRoot, file, edit, revision, nestingUnit)
        if (!written.ok) {
          if (written.error !== 'stale') return err(written.error)
          await reload(projectRoot, file, entry)
          return err('changed-elsewhere')
        }
        entry.undo.push({ previous: written.value.previous, after: written.value.document.revision })
        entry.document = { ...written.value.document, nestingUnit: written.value.document.nestingUnit ?? nestingUnit }
        return ok(stateOf(entry))
      })
      // Outside this outline's queue, so two outlines renaming at once never wait on each other.
      const projectRoot = root()
      if (result.ok && projectRoot) await followRename(projectRoot, file, before, result.value.outline)
      return result
    },

    async undo(file) {
      const entry = open.get(file)
      if (!entry) return err('not-open' as const)
      const before = entry.document.outline
      const result = await serially(entry, async (): Promise<Result<OutlineState, UndoFailure>> => {
        const projectRoot = root()
        if (!projectRoot) return err('no-project')
        const last = entry.undo.at(-1)
        if (!last) return err('nothing-to-undo')
        const restored = await repository.restoreOutline(projectRoot, file, last.previous, last.after)
        if (!restored.ok) {
          if (restored.error !== 'stale') return err(restored.error)
          // Another program changed the file after this edit: undoing would overwrite its change.
          entry.undo = []
          await reload(projectRoot, file, entry)
          return err('changed-elsewhere')
        }
        entry.undo.pop()
        // The file is now as the previous edit left it, so the next undo starts from what was just written.
        const next = entry.undo.at(-1)
        if (next) next.after = restored.value.revision
        entry.document = { ...restored.value, nestingUnit: restored.value.nestingUnit ?? entry.document.nestingUnit }
        return ok(stateOf(entry))
      })
      const projectRoot = root()
      if (result.ok && projectRoot) await followRename(projectRoot, file, before, result.value.outline)
      return result
    },

    async fileChanged(file) {
      const entry = open.get(file)
      const projectRoot = root()
      if (entry && projectRoot) await serially(entry, () => reload(projectRoot, file, entry))
    },

    onEvent(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    reset() {
      open = new Map()
    },

    idle: async () => {
      await Promise.all([...open.values()].map((entry) => entry.queue))
    },
  }
}

/** The one section whose name changed, all else in place: a rename, or its undo. */
function renamedSection(before: Outline, after: Outline): number | null {
  if (before.sections.length !== after.sections.length) return null
  const changed = before.sections.flatMap((section, index) => (section.name === after.sections[index]?.name ? [] : [index]))
  const [only] = changed
  return changed.length === 1 && only !== undefined && before.sections[only]?.name !== null && after.sections[only]?.name !== null
    ? only
    : null
}
