import type {
  ChangeProblem,
  ContentsChange,
  FileStore,
  IdGenerator,
  JournalStep,
  JournalStore,
  ProjectFolders,
  ProjectRepository,
  ProjectSnapshot,
  RenameFileProblem,
  StoredText,
  WriteProblem,
} from '@plotdevice/application'
import {
  addChapter,
  addPart,
  chapterFileFor,
  CURRENT_SCHEMA_VERSION,
  moveChapter,
  projectFolderName,
  removeChapter,
  renameChapterLink,
  renamePart,
  replaceChapterFile,
  validateNewProject,
  type ManuscriptProblem,
} from '@plotdevice/domain'
import { editContents, newChapterFile, newContentsFile, newProjectFile, rewriteLinksTo, setFrontmatterValues, splitFrontmatter, type ContentsEdit } from '@plotdevice/markdown'
import { collisionKey, dirnameOf, err, ok, parseProjectPath, stemOf, type ProjectPath, type Result } from '@plotdevice/shared'
import { recoverJournals, runJournaled, type CrashAt } from './journal'
import { CONTENTS_FILE, MANUSCRIPT_FOLDER, PROJECT_FILE, readDetails, readProject } from './read-project'

export interface RepositoryOptions {
  folders: ProjectFolders
  journals: JournalStore
  ids: IdGenerator
  /** Test seam for interrupting a journaled operation. */
  crashAt?: CrashAt
}

/**
 * Projects as folders of Markdown (DOMAIN_AND_FILE_FORMAT.md 0.4). Every change is checked against the
 * domain rules first, then written as splices with the revision it expects, so a file changed outside
 * the app is never overwritten (ADR 0003, 0005, 0006).
 */
export function createProjectRepository(options: RepositoryOptions): ProjectRepository {
  const { folders, journals, ids, crashAt } = options
  const projectKey = (snapshot: ProjectSnapshot): string => snapshot.details.id ?? snapshot.root

  async function open(root: string) {
    const store = folders.open(root)
    await store.tidy()
    const details = await readDetails(store, [])
    if (!details.ok) return details
    const recovered = await recoverJournals(store, journals, details.value.id ?? root)
    return readProject(root, store, recovered)
  }

  async function reopen(root: string): Promise<Result<ProjectSnapshot, ChangeProblem>> {
    const opened = await open(root)
    return opened.ok ? opened : err('unreadable')
  }

  /** Reads `CONTENTS.md`, refusing if it changed since the snapshot. */
  async function freshContents(store: FileStore, snapshot: ProjectSnapshot) {
    const read = await store.read(CONTENTS_FILE)
    if (!read.ok) return err('unreadable' as const)
    return read.value.revision === snapshot.contentsRevision ? ok(read.value) : err('stale' as const)
  }

  return {
    open,

    async create(location, project) {
      const valid = validateNewProject(project)
      if (!valid.ok) return err('invalid-details')
      const folder = await folders.create(location, projectFolderName(valid.value.title), [MANUSCRIPT_FOLDER])
      if (!folder.ok) return err(folder.error === 'exists' ? 'folder-exists' : folder.error)
      const store = folders.open(folder.value)
      const projectFile = newProjectFile({ ...valid.value, chapterNumbering: 'continuous', id: ids.next('prj'), schemaVersion: CURRENT_SCHEMA_VERSION })
      const written = [await store.write(PROJECT_FILE, { text: projectFile, hasBom: false }, null), await store.write(CONTENTS_FILE, { text: newContentsFile(valid.value.title), hasBom: false }, null)]
      if (written.some((w) => !w.ok)) return err('io')
      const opened = await open(folder.value)
      return opened.ok ? opened : err('io')
    },

    async changeContents(snapshot, change) {
      const store = folders.open(snapshot.root)
      const planned = await planContentsChange(store, snapshot, change, ids)
      if (!planned.ok) return planned
      const contents = await freshContents(store, snapshot)
      if (!contents.ok) return contents
      const edited = editContents(contents.value.text, planned.value.edit)
      if (!edited.ok) return err('invalid')
      if (planned.value.newChapter) {
        const created = await store.write(planned.value.newChapter.file, { text: planned.value.newChapter.text, hasBom: false }, null)
        if (!created.ok) return err('write-failed')
      }
      const written = await store.write(CONTENTS_FILE, { text: edited.value, hasBom: contents.value.hasBom }, contents.value.revision)
      if (!written.ok) return err(writeProblem(written.error))
      return reopen(snapshot.root)
    },

    async renameChapter(snapshot, file, title) {
      const chapter = snapshot.chapters.find((c) => c.file === file)
      if (!chapter) return err('not-found')
      if (chapter.status !== 'ok') return err('unreadable')
      const renamed = chapter.listed ? renameChapterLink(snapshot.contents, file, title) : title.trim() ? ok(snapshot.contents) : err('empty-name' as const)
      if (!renamed.ok) return err('invalid')
      const store = folders.open(snapshot.root)
      const contents = chapter.listed ? await freshContents(store, snapshot) : null
      if (contents && !contents.ok) return contents
      const current = await store.read(file)
      if (!current.ok) return err('unreadable')
      if (current.value.revision !== chapter.revision) return err('stale')
      const updated = setFrontmatterValues(current.value.text, { title: title.trim() })
      if (!updated.ok) return err('unreadable')
      // The title lives in the chapter, so the chapter is written first; an interruption leaves only
      // outdated link text, which the next open reports.
      const written = await store.write(file, { text: updated.value, hasBom: current.value.hasBom }, current.value.revision)
      if (!written.ok) return err(writeProblem(written.error))
      if (contents?.ok) {
        const edited = editContents(contents.value.text, { kind: 'set-link-text', file, linkText: title.trim() })
        if (!edited.ok) return err('invalid')
        const linked = await store.write(CONTENTS_FILE, { text: edited.value, hasBom: contents.value.hasBom }, contents.value.revision)
        if (!linked.ok) return err(writeProblem(linked.error))
      }
      return reopen(snapshot.root)
    },

    async renameChapterFile(snapshot, file, newName) {
      const store = folders.open(snapshot.root)
      const chapter = snapshot.chapters.find((c) => c.file === file)
      if (!chapter) return err('not-found')
      const target = targetPath(file, newName)
      if (!target.ok) return target
      const to = target.value
      if (to === file) return ok({ snapshot, linksUpdated: 0, filesChanged: [] })
      const files = await store.listMarkdownFiles()
      const others = files.filter((f) => collisionKey(f) !== collisionKey(file))
      if (others.some((f) => collisionKey(f) === collisionKey(to))) return err('name-taken')

      const source = await store.read(file)
      if (!source.ok) return err(source.error === 'missing' ? 'not-found' : 'unreadable')
      if (source.value.revision !== chapter.revision) return err('stale')
      const contents = await freshContents(store, snapshot)
      if (!contents.ok) return contents

      const steps: JournalStep[] = [{ kind: 'rename', from: file, to, revision: source.value.revision }]
      if (chapter.listed) {
        const edited = editContents(contents.value.text, { kind: 'set-target', file, newFile: to })
        if (!edited.ok) return err('invalid')
        steps.push(writeStep(store, CONTENTS_FILE, contents.value, edited.value))
      }
      // A bare [[name]] means this file only if no other file shares its name (Obsidian resolves by name).
      const nameIsUnique = !others.some((f) => collisionKey(stemOf(f)) === collisionKey(stemOf(file)))
      let linksUpdated = 0
      for (const path of others) {
        if (path === CONTENTS_FILE) continue
        const read = await store.read(path)
        if (!read.ok) continue
        const rewritten = rewriteLinksTo(read.value.text, dirnameOf(path), file, to, { wikilinkNameIsUnique: nameIsUnique })
        if (rewritten.count === 0) continue
        linksUpdated += rewritten.count
        steps.push(writeStep(store, path, read.value, rewritten.text))
      }

      const outcome = await runJournaled(store, journals, projectKey(snapshot), { id: ids.next('jrn'), operation: 'rename-chapter-file', steps }, crashAt)
      if (outcome !== 'done') return err('write-failed')
      const reopened = await reopen(snapshot.root)
      if (!reopened.ok) return reopened
      const filesChanged = steps.flatMap((step) => (step.kind === 'write' ? [step.path] : [])).sort()
      return ok({ snapshot: reopened.value, linksUpdated, filesChanged })
    },

    async readChapter(root, file) {
      const read = await folders.open(root).read(file)
      if (!read.ok) return err(read.error === 'missing' ? 'missing' : 'unreadable')
      return ok({ text: splitFrontmatter(read.value.text).body, revision: read.value.revision })
    },

    async saveChapter(root, file, text, expected) {
      const store = folders.open(root)
      const current = await store.read(file)
      if (!current.ok) return err(current.error === 'missing' ? 'missing' : 'unreadable')
      if (current.value.revision !== expected) return err('stale')
      const frontmatter = splitFrontmatter(current.value.text).frontmatter?.text ?? ''
      const written = await store.write(file, { text: frontmatter + text, hasBom: current.value.hasBom }, expected)
      if (written.ok) return written
      return err(written.error.code === 'stale' ? 'stale' : 'write-failed')
    },
  }
}

interface PlannedChange {
  edit: ContentsEdit
  newChapter?: { file: ProjectPath; text: string }
}

/** Checks a change against the domain rules and turns it into a `CONTENTS.md` edit. Nothing is written here. */
async function planContentsChange(store: FileStore, snapshot: ProjectSnapshot, change: ContentsChange, ids: IdGenerator): Promise<Result<PlannedChange, ChangeProblem>> {
  const { contents } = snapshot
  const check = (result: Result<unknown, ManuscriptProblem>): ChangeProblem | null =>
    result.ok ? null : result.error === 'not-in-book' ? 'not-found' : 'invalid'
  switch (change.kind) {
    case 'add-chapter': {
      const file = chapterFileFor(change.title, await store.listMarkdownFiles())
      const problem = check(addChapter(contents, { kind: 'chapter', file, linkText: change.title }, change.placement))
      if (problem) return err(problem)
      const title = change.title.trim()
      return ok({ edit: { kind: 'add-chapter', file, linkText: title, placement: change.placement }, newChapter: { file, text: newChapterFile(title, ids.next('ch'), change.text ?? '') } })
    }
    case 'add-to-book': {
      const chapter = snapshot.chapters.find((c) => c.file === change.file && !c.listed)
      if (!chapter) return err('not-found')
      const linkText = chapter.title ?? stemOf(change.file)
      const problem = check(addChapter(contents, { kind: 'chapter', file: change.file, linkText }, change.placement))
      return problem ? err(problem) : ok({ edit: { kind: 'add-chapter', file: change.file, linkText, placement: change.placement } })
    }
    case 'move-chapter': {
      const problem = check(moveChapter(contents, change.file, change.placement))
      return problem ? err(problem) : ok({ edit: { kind: 'move-chapter', file: change.file, placement: change.placement } })
    }
    case 'remove-from-book': {
      const problem = check(removeChapter(contents, change.file))
      return problem ? err(problem) : ok({ edit: { kind: 'remove-chapter', file: change.file } })
    }
    case 'add-part': {
      const problem = check(addPart(contents, change.name, change.index))
      return problem ? err(problem) : ok({ edit: { kind: 'add-part', name: change.name, index: change.index } })
    }
    case 'rename-part': {
      const problem = check(renamePart(contents, change.part, change.name))
      return problem ? err(problem) : ok({ edit: { kind: 'rename-part', part: change.part, name: change.name } })
    }
    case 'relink': {
      if (!snapshot.missing.includes(change.missing) || !snapshot.chapters.some((c) => c.file === change.found && !c.listed)) return err('not-found')
      const problem = check(replaceChapterFile(contents, change.missing, change.found))
      return problem ? err(problem) : ok({ edit: { kind: 'set-target', file: change.missing, newFile: change.found } })
    }
    case 'update-link-text': {
      const title = snapshot.chapters.find((c) => c.file === change.file)?.title
      if (title === undefined) return err('not-found')
      const problem = check(renameChapterLink(contents, change.file, title))
      return problem ? err(problem) : ok({ edit: { kind: 'set-link-text', file: change.file, linkText: title } })
    }
  }
}

/** The renamed file's path: same folder, new name; `.md` added if missing. */
function targetPath(file: ProjectPath, newName: string): Result<ProjectPath, RenameFileProblem> {
  const name = newName.trim().replace(/\.md$/i, '')
  if (name === '' || /[/\\]/.test(name)) return err('invalid-name')
  const folder = dirnameOf(file)
  const parsed = parseProjectPath(`${folder ? `${folder}/` : ''}${name}.md`)
  return parsed.ok ? parsed : err('invalid-name')
}

/** A journal step that replaces `current` with `text`, recording both revisions so recovery can tell what happened. */
function writeStep(store: FileStore, path: ProjectPath, current: StoredText, text: string): JournalStep {
  return { kind: 'write', path, before: current.revision, after: store.revisionOf({ text, hasBom: current.hasBom }), text, hasBom: current.hasBom }
}

function writeProblem(problem: WriteProblem): ChangeProblem {
  return problem.code === 'stale' ? 'stale' : 'write-failed'
}
