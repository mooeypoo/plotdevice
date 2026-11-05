import type {
  ChangeProblem,
  ContentsChange,
  FolderRenameBlock,
  FolderRenamePlan,
  FileStore,
  IdGenerator,
  JournalStep,
  JournalStore,
  ProjectFolders,
  ProjectRepository,
  ProjectSnapshot,
  ProjectTemplate,
  RenameFileProblem,
  StoredText,
  WriteProblem,
} from '@plotdevice/application'
import {
  addChapter,
  addPart,
  chapterCopyFileFor,
  chapterFileFor,
  pageFolderOf,
  CURRENT_SCHEMA_VERSION,
  moveChapter,
  outlineFileFor,
  projectFolderName,
  removeChapter,
  renameChapterLink,
  renamePart,
  replaceChapterFile,
  validateNewProject,
  type ManuscriptProblem,
  isDefaultKinds,
  type ManuscriptUnit,
  type PageKind,
  isValidKindFolder,
  withRenamedFolders,
  type FolderRename,
} from '@plotdevice/domain'
import {
  editContents,
  formatScalar,
  newChapterFile,
  newContentsFile,
  newOutlineFile,
  newProjectFile,
  readFrontmatter,
  rewriteLinksTo,
  setFrontmatterBlock,
  setFrontmatterList,
  setFrontmatterValues,
  splitFrontmatter,
  type ContentsEdit,
} from '@plotdevice/markdown'
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

  /** One targeted change to `project.md`'s details, refused if the file changed meanwhile. */
  async function patchProject(
    snapshot: ProjectSnapshot,
    change: (text: string) => Result<string, unknown>,
  ): Promise<Result<ProjectSnapshot, ChangeProblem>> {
    const store = folders.open(snapshot.root)
    const current = await store.read(PROJECT_FILE)
    if (!current.ok) return err('unreadable')
    const text = change(current.value.text)
    if (!text.ok) return err('unreadable')
    if (text.value === current.value.text) return ok(snapshot)
    const written = await store.write(PROJECT_FILE, { text: text.value, hasBom: current.value.hasBom }, current.value.revision)
    if (!written.ok) return err(writeProblem(written.error))
    return reopen(snapshot.root)
  }

  return {
    open,

    async create(location, project, template) {
      const valid = validateNewProject(project)
      if (!valid.ok) return err('invalid-details')
      // The outlines' files first: the template's first outline is the book's main outline (ADR 0012).
      const outlines: { file: ProjectPath; text: string }[] = []
      for (const outline of template?.outlines ?? []) {
        const file = outlineFileFor(
          outline.title,
          outlines.map((o) => o.file),
        )
        outlines.push({ file, text: newOutlineFile(outline.title, undefined, outline.body) })
      }
      const projectFile = withTemplate(
        newProjectFile({ ...valid.value, chapterNumbering: 'continuous', id: ids.next('prj'), schemaVersion: CURRENT_SCHEMA_VERSION }),
        template,
        outlines[0]?.file ?? null,
      )
      if (!projectFile.ok) return err('invalid-details')
      const folder = await folders.create(location, projectFolderName(valid.value.title), [MANUSCRIPT_FOLDER])
      if (!folder.ok) return err(folder.error === 'exists' ? 'folder-exists' : folder.error)
      const store = folders.open(folder.value)
      // The new folder is empty, so every file is written as new (`expected: null`), never over another.
      const files: { file: ProjectPath; text: string }[] = [{ file: PROJECT_FILE, text: projectFile.value }]
      let contents = newContentsFile(valid.value.title)
      if (template?.firstChapter) {
        const file = chapterFileFor(valid.value.title, [])
        const edited = editContents(contents, {
          kind: 'add-chapter',
          file,
          linkText: valid.value.title,
          placement: { part: null, index: 0 },
        })
        if (!edited.ok) return err('invalid-details')
        contents = edited.value
        files.push({ file, text: newChapterFile(valid.value.title, ids.next('ch')) })
      }
      files.push({ file: CONTENTS_FILE, text: contents }, ...outlines)
      for (const { file, text } of files) {
        const written = await store.write(file, { text, hasBom: false }, null)
        if (!written.ok) return err('io')
      }
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
      const renamed = chapter.listed
        ? renameChapterLink(snapshot.contents, file, title)
        : title.trim()
          ? ok(snapshot.contents)
          : err('empty-name' as const)
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

    async planFolderRenames(snapshot, renames) {
      const planned = await planRenames(folders.open(snapshot.root), snapshot, renames)
      return planned.plan
    },

    async renameFolders(snapshot, renames) {
      const store = folders.open(snapshot.root)
      const { plan, steps, restore } = await planRenames(store, snapshot, renames)
      if (plan.renames.some((rename) => rename.blocked !== null)) return err('blocked')
      const project = await store.read(PROJECT_FILE)
      if (!project.ok) return err('unreadable')
      const kindsText = setFrontmatterBlock(project.value.text, 'kinds', kindsLines(withRenamedFolders(snapshot.details.kinds, renames)))
      if (!kindsText.ok) return err('unreadable')
      const projectStep = writeStep(store, PROJECT_FILE, project.value, kindsText.value)
      const forward = [...steps, projectStep]
      const outcome = await runJournaled(
        store,
        journals,
        projectKey(snapshot),
        { id: ids.next('jrn'), operation: 'rename-folder', steps: forward },
        crashAt,
      )
      if (outcome !== 'done') return err('write-failed')
      for (const rename of renames) await store.removeEmptyFolder(rename.from)

      // The reverse: the old texts back where they are now, then each page back to its folder (ADR 0005).
      const writes = forward.flatMap((step): JournalStep[] =>
        step.kind === 'write'
          ? [
              {
                kind: 'write',
                path: step.path,
                before: step.after,
                after: step.before,
                text: restore.get(step.path) ?? project.value.text,
                hasBom: step.hasBom,
              },
            ]
          : [],
      )
      const moves = forward.flatMap((step): JournalStep[] =>
        step.kind === 'rename' ? [{ kind: 'rename', from: step.to, to: step.from, revision: step.revision }] : [],
      )
      const undo = {
        entry: { id: ids.next('jrn'), operation: 'undo-rename-folder' as const, steps: [...writes, ...moves] },
        renames: renames.map(({ from, to }) => ({ from, to })),
      }
      const reopened = await reopen(snapshot.root)
      return reopened.ok ? ok({ snapshot: reopened.value, undo, linksUpdated: plan.linksUpdated }) : reopened
    },

    async undoFolderRenames(snapshot, undo) {
      const store = folders.open(snapshot.root)
      // Files whose links the rename rewrote must be as it left them, or their old text would replace
      // the author's since. A page that only moved goes back as it is now, edits and all. Nothing is
      // touched unless every check passes.
      const written = new Set<ProjectPath>()
      for (const step of undo.entry.steps) {
        if (step.kind !== 'write') continue
        const read = await store.read(step.path)
        if (!read.ok || read.value.revision !== step.before) return err('stale')
        written.add(step.path)
      }
      const steps: JournalStep[] = []
      for (const step of undo.entry.steps) {
        if (step.kind === 'write') steps.push(step)
        else if (written.has(step.from)) steps.push(step)
        else {
          const read = await store.read(step.from)
          if (!read.ok) return err('stale')
          steps.push({ ...step, revision: read.value.revision })
        }
      }
      // A page added to a renamed folder since would be left behind: the folder names stay.
      const moving = new Set(steps.flatMap((step) => (step.kind === 'rename' ? [collisionKey(step.from)] : [])))
      for (const { to } of undo.renames)
        if ((await store.listFiles(to)).some((file) => !moving.has(collisionKey(file)))) return err('stale')
      const outcome = await runJournaled(store, journals, projectKey(snapshot), { ...undo.entry, steps }, crashAt)
      if (outcome !== 'done') return err('write-failed')
      for (const { to } of undo.renames) await store.removeEmptyFolder(to)
      return reopen(snapshot.root)
    },

    async setKinds(snapshot, kinds, manuscriptUnit) {
      const store = folders.open(snapshot.root)
      const current = await store.read(PROJECT_FILE)
      if (!current.ok) return err('unreadable')
      // Only these two keys change; back to the defaults, a key goes (ADR 0011, decision 2).
      const withKinds = setFrontmatterBlock(current.value.text, 'kinds', kindsLines(kinds))
      if (!withKinds.ok) return err('unreadable')
      const withUnit = setFrontmatterBlock(withKinds.value, 'manuscriptUnit', unitLines(manuscriptUnit))
      if (!withUnit.ok) return err('unreadable')
      if (withUnit.value === current.value.text) return ok(snapshot)
      const written = await store.write(PROJECT_FILE, { text: withUnit.value, hasBom: current.value.hasBom }, current.value.revision)
      if (!written.ok) return err(writeProblem(written.error))
      return reopen(snapshot.root)
    },

    setMainOutline(snapshot, file) {
      return patchProject(snapshot, (text) => setFrontmatterBlock(text, 'mainOutline', mainOutlineLines(file)))
    },

    setOutlineRoles(snapshot, { setAside, mainOutline }) {
      return patchProject(snapshot, (text) => {
        const aside = setFrontmatterList(text, 'setAside', setAside)
        return aside.ok ? setFrontmatterBlock(aside.value, 'mainOutline', mainOutline && mainOutlineLines(mainOutline)) : aside
      })
    },

    async renameFile(snapshot, file, newName) {
      const store = folders.open(snapshot.root)
      // A chapter, or a character, place or note page; pages aren't in the snapshot or the contents.
      const chapter = snapshot.chapters.find((c) => c.file === file) ?? (pageFolderOf(file) ? { revision: undefined, listed: false } : null)
      if (!chapter) return err('not-found')
      const target = targetPath(file, newName)
      if (!target.ok) return target
      const to = target.value
      if (to === file) return ok({ snapshot, file, linksUpdated: 0, filesChanged: [] })
      const files = await store.listMarkdownFiles()
      const others = files.filter((f) => collisionKey(f) !== collisionKey(file))
      if (others.some((f) => collisionKey(f) === collisionKey(to))) return err('name-taken')

      const source = await store.read(file)
      if (!source.ok) return err(source.error === 'missing' ? 'not-found' : 'unreadable')
      if (chapter.revision !== undefined && source.value.revision !== chapter.revision) return err('stale')
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

      const outcome = await runJournaled(
        store,
        journals,
        projectKey(snapshot),
        { id: ids.next('jrn'), operation: 'rename-chapter-file', steps },
        crashAt,
      )
      if (outcome !== 'done') return err('write-failed')
      const reopened = await reopen(snapshot.root)
      if (!reopened.ok) return reopened
      const filesChanged = steps.flatMap((step) => (step.kind === 'write' ? [step.path] : [])).sort()
      return ok({ snapshot: reopened.value, file: to, linksUpdated, filesChanged })
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

    async saveChapterCopy(root, file, text, label) {
      const store = folders.open(root)
      const current = await store.read(file)
      const frontmatter = current.ok ? (splitFrontmatter(current.value.text).frontmatter?.text ?? '') : ''
      const values = current.ok ? readFrontmatter(current.value.text) : null
      const title = values?.ok && typeof values.value.title === 'string' ? values.value.title : stemOf(file)
      const copyTitle = `${title} (${label})`
      // Only chapters have ids (ADR 0008); a copy of a character, place or note page gets none.
      const isChapter = file.startsWith(`${MANUSCRIPT_FOLDER}/`)
      const id = isChapter ? ids.next('ch') : null
      const withDetails = setFrontmatterValues(frontmatter, id ? { title: copyTitle, id } : { title: copyTitle })
      const fallback = id ? newChapterFile(copyTitle, id, text) : `---\ntitle: ${formatScalar(copyTitle)}\n---\n${text}`
      const content = { text: withDetails.ok ? withDetails.value + text : fallback, hasBom: current.ok && current.value.hasBom }
      // A name taken between listing and writing is refused (`expected: null`), so look again.
      for (let attempt = 0; attempt < 3; attempt++) {
        const copy = chapterCopyFileFor(file, label, await store.listMarkdownFiles())
        const written = await store.write(copy, content, null)
        if (written.ok) return ok(copy)
        if (written.error.code !== 'stale') break
      }
      return err('write-failed')
    },
  }
}

interface PlannedChange {
  edit: ContentsEdit
  newChapter?: { file: ProjectPath; text: string }
}

/** Checks a change against the domain rules and turns it into a `CONTENTS.md` edit. Nothing is written here. */
async function planContentsChange(
  store: FileStore,
  snapshot: ProjectSnapshot,
  change: ContentsChange,
  ids: IdGenerator,
): Promise<Result<PlannedChange, ChangeProblem>> {
  const { contents } = snapshot
  const check = (result: Result<unknown, ManuscriptProblem>): ChangeProblem | null =>
    result.ok ? null : result.error === 'not-in-book' ? 'not-found' : 'invalid'
  switch (change.kind) {
    case 'add-chapter': {
      const file = chapterFileFor(change.title, await store.listMarkdownFiles())
      const problem = check(addChapter(contents, { kind: 'chapter', file, linkText: change.title }, change.placement))
      if (problem) return err(problem)
      const title = change.title.trim()
      return ok({
        edit: { kind: 'add-chapter', file, linkText: title, placement: change.placement },
        newChapter: { file, text: newChapterFile(title, ids.next('ch'), change.text ?? '') },
      })
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
      if (!snapshot.missing.includes(change.missing) || !snapshot.chapters.some((c) => c.file === change.found && !c.listed))
        return err('not-found')
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
/**
 * What renaming folders would do: each page's move, every link that would change (in every Markdown
 * file, and in the moved pages read from their new place), and what blocks a rename. Reads only.
 * `restore` keeps each changed file's text as it is now, for the undo.
 */
async function planRenames(
  store: FileStore,
  snapshot: ProjectSnapshot,
  renames: readonly FolderRename[],
): Promise<{ plan: FolderRenamePlan; steps: JournalStep[]; restore: Map<ProjectPath, string> }> {
  const files = await store.listMarkdownFiles()
  const targets = new Set(renames.map((rename) => collisionKey(rename.to)))
  const rows: FolderRenamePlan['renames'] = []
  const moves = new Map<ProjectPath, ProjectPath>()
  for (const { from, to } of renames) {
    const inFolder = from === '' ? [] : await store.listFiles(from)
    const pages = files.filter((file) => file.startsWith(`${from}/`))
    let blocked: FolderRenameBlock | null = null
    if (!isValidKindFolder(to)) blocked = 'invalid-name'
    else if (collisionKey(from) === collisionKey(to)) blocked = 'case-only'
    else if (inFolder.length === 0) blocked = 'missing'
    else if (inFolder.some((file) => !/\.md$/i.test(file))) blocked = 'other-files'
    else if ((await store.listFiles(to)).length > 0 || renames.filter((each) => collisionKey(each.to) === collisionKey(to)).length > 1)
      blocked = 'exists'
    else if (targets.has(collisionKey(from)) && renames.some((each) => collisionKey(each.to) === collisionKey(from))) blocked = 'exists'
    rows.push({ from, to, files: pages.length, blocked })
    for (const page of pages) moves.set(page, `${to}${page.slice(from.length)}` as ProjectPath)
  }

  const steps: JournalStep[] = []
  for (const [from, to] of moves) {
    const read = await store.read(from)
    if (read.ok) steps.push({ kind: 'rename', from, to, revision: read.value.revision })
  }
  const restore = new Map<ProjectPath, string>()
  const changed: ProjectPath[] = []
  let linksUpdated = 0
  for (const file of files) {
    const read = await store.read(file)
    if (!read.ok) continue
    // A moved page is read from its new place: links to its siblings stay as written.
    const at = moves.get(file) ?? file
    let text = read.value.text
    let count = 0
    for (const [from, to] of moves) {
      // A bare [[name]] keeps meaning the same page: moving a folder doesn't change its name.
      const rewritten = rewriteLinksTo(text, dirnameOf(at), from, to, { wikilinkNameIsUnique: false })
      text = rewritten.text
      count += rewritten.count
    }
    if (count === 0) continue
    linksUpdated += count
    changed.push(at)
    restore.set(at, read.value.text)
    steps.push(writeStep(store, at, read.value, text))
  }
  return { plan: { renames: rows, linksUpdated, filesChanged: changed.sort() }, steps, restore }
}

function writeStep(store: FileStore, path: ProjectPath, current: StoredText, text: string): JournalStep {
  return {
    kind: 'write',
    path,
    before: current.revision,
    after: store.revisionOf({ text, hasBom: current.hasBom }),
    text,
    hasBom: current.hasBom,
  }
}

/** A new `project.md` with the template's kinds, chapter word, suggested tags and main outline, each only if it has one. */
function withTemplate(
  projectFile: string,
  template: ProjectTemplate | undefined,
  mainOutline: ProjectPath | null,
): Result<string, 'invalid'> {
  if (!template) return ok(projectFile)
  const kinds = setFrontmatterBlock(projectFile, 'kinds', template.kinds ? kindsLines(template.kinds) : null)
  const unit = kinds.ok ? setFrontmatterBlock(kinds.value, 'manuscriptUnit', unitLines(template.manuscriptUnit)) : kinds
  const tags = unit.ok ? setFrontmatterList(unit.value, 'suggestedTags', template.suggestedTags) : unit
  const main = tags.ok ? setFrontmatterBlock(tags.value, 'mainOutline', mainOutline && mainOutlineLines(mainOutline)) : tags
  return main.ok ? main : err('invalid')
}

function mainOutlineLines(file: ProjectPath): string[] {
  return [`mainOutline: ${formatScalar(file)}`]
}

/** `kinds:` as `project.md` writes it: a block list, plain values quoted only when YAML needs it; `null` for the defaults. */
function kindsLines(kinds: readonly PageKind[]): string[] | null {
  if (isDefaultKinds(kinds)) return null
  return [
    'kinds:',
    ...kinds.flatMap((kind) => [
      `  - folder: ${formatScalar(kind.folder)}`,
      ...(kind.one === undefined ? [] : [`    one: ${formatScalar(kind.one)}`]),
      ...(kind.many === undefined ? [] : [`    many: ${formatScalar(kind.many)}`]),
    ]),
  ]
}

function unitLines(unit: ManuscriptUnit | null): string[] | null {
  return unit === null ? null : ['manuscriptUnit:', `  one: ${formatScalar(unit.one)}`, `  many: ${formatScalar(unit.many)}`]
}

function writeProblem(problem: WriteProblem): ChangeProblem {
  return problem.code === 'stale' ? 'stale' : 'write-failed'
}
