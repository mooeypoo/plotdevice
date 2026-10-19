import { projectPathSegments, type ProjectPath } from './project-path'
import { isPathFormLink, type WikiLink } from './wiki-link'

const MARKDOWN_EXTENSION = /\.md$/iu

/**
 * The same link pointed at `newPath`, in the same form: a name link names the new file; a path
 * link keeps as many folders as it had. Shown text, heading, block, and embed are kept.
 */
export function retargetWikiLink(link: WikiLink, newPath: ProjectPath): WikiLink {
  const segments = projectPathSegments(newPath)
  const last = segments.length - 1
  const withoutExtension = segments.map((segment, index) =>
    index === last ? segment.replace(MARKDOWN_EXTENSION, '') : segment
  )
  const depth = isPathFormLink(link) ? link.target.split('/').length : 1
  return { ...link, target: withoutExtension.slice(-depth).join('/') }
}
