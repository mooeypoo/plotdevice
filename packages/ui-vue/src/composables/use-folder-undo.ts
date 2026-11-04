import { useProjectStore } from '../stores/project'
import { useStoryStore } from '../stores/story'

/** "Undo folder renames" (Milestone 18): from the notice after renaming, or the book menu until the book closes. */
export function useFolderUndo() {
  const project = useProjectStore()
  const story = useStoryStore()
  return async function undoFolders(): Promise<void> {
    const back = await project.undoFolderRenames()
    if (back) await story.followFolders(back)
  }
}
