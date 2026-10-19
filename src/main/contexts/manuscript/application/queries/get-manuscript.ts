import { buildLinkIndex, type LinkCandidate } from '../../../../shared-kernel/link-index'
import { arrangeManuscript, type Manuscript } from '../../domain/manuscript'
import type { ManuscriptRepository } from '../../domain/ports/manuscript-repository'

/** The arranged manuscript, plus every typed file so the editor can style links by type. */
export interface ManuscriptView {
  readonly manuscript: Manuscript
  readonly linkCandidates: readonly LinkCandidate[]
}

/** Reads the project's parts and chapters and arranges them. */
export type GetManuscript = () => Promise<ManuscriptView>

/** Builds the `GetManuscript` query. */
export function createGetManuscript(ports: {
  readonly repository: ManuscriptRepository
}): GetManuscript {
  return async () => {
    const files = await ports.repository.load()
    const links = buildLinkIndex(files.linkCandidates)
    return {
      manuscript: arrangeManuscript(files.parts, files.chapters, links),
      linkCandidates: files.linkCandidates
    }
  }
}
