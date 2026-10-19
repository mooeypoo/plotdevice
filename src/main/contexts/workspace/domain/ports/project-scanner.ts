import type { EntryClassification } from '../../../../shared-kernel/entry-type'
import type { ProjectPath } from '../../../../shared-kernel/project-path'
import type { ProjectRoot } from '../project-root'

/** Why a file's frontmatter couldn't be read. Such files are reported and never written to. */
export type ScannedFileProblem =
  'unreadable-file' | 'invalid-encoding' | 'unclosed-frontmatter' | 'unparseable-frontmatter'

/** One markdown file in the project and what its `type` key says it is. */
export interface ScannedFile {
  readonly path: ProjectPath
  readonly classification: EntryClassification
  readonly problem?: ScannedFileProblem
}

/** Every markdown file in a project, plus nested projects that were skipped. */
export interface ProjectScan {
  readonly files: readonly ScannedFile[]
  readonly nestedProjects: readonly ProjectPath[]
}

/** Finds and classifies the project's files (see "Project folder" in docs/file-format.md). */
export interface ProjectScanner {
  scan(root: ProjectRoot): Promise<ProjectScan>
}
