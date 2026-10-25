import { resolveRelative, type ProjectPath } from '@plotdevice/shared'
import { useProjectStore } from '../stores/project'
import { useStoryStore } from '../stores/story'
import { useViewStore } from '../stores/view'

/** Opens what a link in a card points to: a chapter in Write, a character, place or note as its page. */
export function useFollowLink() {
  const project = useProjectStore()
  const story = useStoryStore()
  const view = useViewStore()

  return (fromDir: string, destination: string): void => {
    const raw = destination.startsWith('<') ? destination.slice(1, -1) : destination
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return // web links are not followed from inside the app
    let path: string | null
    try {
      path = resolveRelative(fromDir, decodeURI(raw.split('#')[0] ?? ''))
    } catch {
      return
    }
    if (!path) return
    const file = path as ProjectPath
    if (project.project?.chapters.some((chapter) => chapter.file === file)) view.writeChapter(file)
    else if (story.references.some((reference) => reference.file === file)) story.showing = { kind: 'page', file }
    else if (story.outlines.some((outline) => outline.file === file)) void story.open(file)
  }
}
