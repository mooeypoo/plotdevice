import type { ChapterRef, ProjectView } from '@plotdevice/contracts'
import { moveDown, moveTargets, moveUp, placementAfter, type Placement } from '@plotdevice/presentation'
import type { ProjectPath } from '@plotdevice/shared'
import { computed, type Ref } from 'vue'
import { useProjectStore } from '../stores/project'
import { useSettingsStore } from '../stores/settings'
import type { MenuItem } from '../components/menu'
import { usePrompt } from './use-prompt'

/** The navigator's actions: everything an author can do to the book's arrangement, with prompts and menus. */
export function useNavigator(project: Ref<ProjectView>, openFile: Ref<ProjectPath | null>, openChapter: (file: ProjectPath) => void) {
  const store = useProjectStore()
  const settings = useSettingsStore()
  const { ask } = usePrompt()
  const t = settings.t

  const unlisted = computed(() => project.value.chapters.filter((chapter) => !chapter.listed))
  const missing = computed(() =>
    project.value.missing.map((file) => ({ file, suggestion: project.value.relinkSuggestions.find((suggestion) => suggestion.missing === file)?.found ?? null })),
  )
  const isMissing = (file: ProjectPath): boolean => project.value.missing.includes(file)
  const outdatedTitle = (file: ProjectPath): string | null => project.value.outdatedLinkText.find((entry) => entry.file === file)?.title ?? null

  const move = (file: ProjectPath, placement: Placement | null): Promise<boolean> =>
    placement ? store.changeContents({ kind: 'move-chapter', file, placement }) : Promise.resolve(false)

  async function addChapter(): Promise<void> {
    const title = await ask(t('prompt-chapter-title'))
    if (!title) return
    const before = new Set(project.value.chapters.map((chapter) => chapter.file))
    const added = await store.changeContents({ kind: 'add-chapter', title, placement: placementAfter(project.value.contents, openFile.value) })
    const created = added ? project.value.chapters.find((chapter) => !before.has(chapter.file)) : undefined
    if (created) openChapter(created.file)
  }

  async function addPart(): Promise<void> {
    const name = await ask(t('prompt-part-name'))
    if (name) await store.changeContents({ kind: 'add-part', name, index: project.value.contents.length })
  }

  async function renamePart(part: number, current: string): Promise<void> {
    const name = await ask(t('prompt-part-name'), current)
    if (name && name !== current) await store.changeContents({ kind: 'rename-part', part, name })
  }

  function chapterMenu(chapter: ChapterRef): MenuItem[] {
    const contents = project.value.contents
    const up = moveUp(contents, chapter.file)
    const down = moveDown(contents, chapter.file)
    const title = project.value.chapters.find((c) => c.file === chapter.file)?.title ?? chapter.linkText
    const fileName = chapter.file.split('/').at(-1)?.replace(/\.md$/, '') ?? ''
    return [
      {
        key: 'rename',
        label: t('chapter-rename'),
        run: async () => {
          const next = await ask(t('prompt-chapter-title'), title)
          if (next && next !== title) await store.renameChapter(chapter.file, next)
        },
      },
      {
        key: 'rename-file',
        label: t('chapter-rename-file'),
        run: async () => {
          const next = await ask(t('prompt-file-name'), fileName)
          if (next && next !== fileName) await store.renameChapterFile(chapter.file, next)
        },
      },
      { key: 'move-up', label: t('chapter-move-up'), disabled: !up, group: 'move', run: () => void move(chapter.file, up) },
      { key: 'move-down', label: t('chapter-move-down'), disabled: !down, run: () => void move(chapter.file, down) },
      ...moveTargets(contents, chapter.file).map((target, i) => ({
        key: `move-to-${i}`,
        label: `${t('chapter-move-to')}: ${target.kind === 'part' ? t('move-to-part', target.name) : t(`move-to-${target.kind}`)}`,
        run: () => void move(chapter.file, target.placement),
      })),
      { key: 'remove', label: t('chapter-remove'), group: 'remove', run: () => void store.changeContents({ kind: 'remove-from-book', file: chapter.file }) },
    ]
  }

  /** Alt+Arrow keys move the focused chapter through the reading order. */
  async function moveWithKeyboard(event: KeyboardEvent, file: ProjectPath): Promise<void> {
    const placement = event.key === 'ArrowUp' ? moveUp(project.value.contents, file) : moveDown(project.value.contents, file)
    if (!(await move(file, placement))) return
    document.querySelector<HTMLElement>(`[data-chapter="${CSS.escape(file)}"]`)?.focus()
  }

  return {
    unlisted,
    missing,
    isMissing,
    outdatedTitle,
    addChapter,
    addPart,
    renamePart,
    chapterMenu,
    moveWithKeyboard,
    addToBook: (file: ProjectPath) => store.changeContents({ kind: 'add-to-book', file, placement: { part: null, index: project.value.contents.length } }),
    relink: (missingFile: ProjectPath, found: ProjectPath) => store.changeContents({ kind: 'relink', missing: missingFile, found }),
    updateTitle: (file: ProjectPath) => store.changeContents({ kind: 'update-link-text', file }),
  }
}
