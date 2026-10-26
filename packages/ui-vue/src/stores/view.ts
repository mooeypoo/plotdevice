import type { OutlineViewKind, SaveStatusView, Workspace } from '@plotdevice/contracts'
import type { ProjectPath } from '@plotdevice/shared'
import { defineStore } from 'pinia'
import { ref } from 'vue'

/** How the window is arranged right now. The workspace and outline view are remembered per project. */
export const useViewStore = defineStore('view', () => {
  /** `story` is the Story workspace's fixed internal ID; its name comes only from the message catalogs. */
  const workspace = ref<Workspace>('write')
  const outlineView = ref<OutlineViewKind>('board')
  const focusMode = ref(false)
  const navigatorHidden = ref(false)
  /** A chapter chosen outside Write (in the manuscript outline): Write opens it. */
  const chapterRequest = ref<ProjectPath | null>(null)
  /** The chapter open in Write and its save status, for the top bar and the book menu. */
  const writingChapter = ref<{ file: ProjectPath; name: string } | null>(null)
  const saveStatus = ref<SaveStatusView | null>(null)

  function writeChapter(file: ProjectPath): void {
    chapterRequest.value = file
    workspace.value = 'write'
  }

  function setFocusMode(on: boolean): void {
    focusMode.value = on
  }

  return { workspace, outlineView, focusMode, navigatorHidden, chapterRequest, writingChapter, saveStatus, writeChapter, setFocusMode }
})
