import type { ProjectPath } from '@plotdevice/shared'
import { useApi } from '../api'
import { useProjectStore } from '../stores/project'
import { useSettingsStore } from '../stores/settings'
import { useStoryStore } from '../stores/story'
import type { MenuItem } from '../components/menu'
import { useConfirm } from './use-confirm'

/**
 * An outline's place in the book (Milestone 20): main, in use, set aside, or deleted. The sidebar,
 * the outline's own ⋯ and its timeline row all offer the same commands with the same words.
 */
export function useOutlineRoles() {
  const api = useApi()
  const project = useProjectStore()
  const story = useStoryStore()
  const t = useSettingsStore().t
  const { confirm } = useConfirm()

  const titleOf = (file: ProjectPath): string => story.outlines.find((entry) => entry.file === file)?.title ?? file
  /** Who takes over if `file` stops being in use: the first other outline in use. */
  const nextMain = (file: ProjectPath): ProjectPath | null =>
    file === story.mainOutline ? (story.outlinesInUse.find((entry) => entry.file !== file)?.file ?? null) : null

  async function makeMain(file: ProjectPath): Promise<void> {
    if (await confirm(t('main-swap-question', titleOf(file)), t('main-swap-action'))) await story.makeMain(file)
  }

  async function setAside(file: ProjectPath, aside: boolean): Promise<void> {
    const next = aside ? nextMain(file) : null
    if (!(await project.change(() => api.setOutlineAside(file, aside)))) return
    await story.afterRolesChanged()
    if (next) project.tell('outline-now-main', titleOf(next))
  }

  /** Deletes one outline after a plain confirmation, to the Trash; without a Trash, only after a stronger one. */
  async function remove(file: ProjectPath): Promise<void> {
    const title = titleOf(file)
    const next = nextMain(file)
    const timeline = await api.getTimeline()
    const linedUp = timeline.ok
      ? timeline.value.threads
          .filter((thread) => thread.file !== file)
          .flatMap((thread) => thread.sections.filter((section) => section.lineUp?.outline === file)).length
      : 0
    const extra = [
      ...(linedUp > 0 ? [t('outline-delete-lined-up', linedUp)] : []),
      ...(next ? [t('outline-delete-new-main', titleOf(next))] : []),
    ]
    if (!(await confirm([t('outline-delete-question', title), ...extra].join(' '), t('outline-delete-action')))) return
    let deleted = await api.deleteOutline(file, 'trash')
    let how: 'trash' | 'for-good' = 'trash'
    if (!deleted.ok && deleted.error === 'no-trash') {
      if (!(await confirm([t('outline-delete-for-good-question', title), ...extra].join(' '), t('outline-delete-for-good')))) return
      how = 'for-good'
      deleted = await api.deleteOutline(file, how)
    }
    if (!deleted.ok) {
      project.tell('outline-delete-failed')
      return
    }
    project.setProject(deleted.value)
    await story.afterOutlineDeleted(file)
    // Who became main was said in the confirmation.
    project.tell(how === 'trash' ? 'outline-deleted' : 'outline-deleted-for-good', title)
  }

  /** The commands for one outline's ⋯ menu. */
  function menu(file: ProjectPath): MenuItem[] {
    const aside = story.isSetAside(file)
    return [
      ...(aside || file === story.mainOutline
        ? []
        : [{ key: 'outline-make-main', label: t('outline-make-main'), run: () => void makeMain(file) }]),
      aside
        ? { key: 'outline-bring-back', label: t('outline-bring-back'), group: 'place', run: () => void setAside(file, false) }
        : { key: 'outline-set-aside', label: t('outline-set-aside'), group: 'place', run: () => void setAside(file, true) },
      { key: 'outline-delete', label: t('outline-delete'), group: 'delete', run: () => void remove(file) },
    ]
  }

  return { makeMain, setAside, remove, menu }
}
