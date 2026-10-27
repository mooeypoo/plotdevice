import type { CardLinksView, ReferencePageView } from '@plotdevice/contracts'
import type { ProjectPath } from '@plotdevice/shared'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useApi } from '../api'
import { useProjectStore } from './project'

/**
 * The reference shelf beside the page in Write. Pinned pages, in the author's order, are personal and
 * kept per project in app data; pages opened from search sit above them until pinned or closed.
 */
export const useShelfStore = defineStore('shelf', () => {
  const api = useApi()
  const project = useProjectStore()
  const visible = ref(false)
  const pinned = ref<ProjectPath[]>([])
  const opened = ref<ProjectPath[]>([])
  const pages = ref<Partial<Record<ProjectPath, ReferencePageView>>>({})
  const aboutChapter = ref<CardLinksView[]>([])
  /** The tags chosen on the shelf, by the part being written (`''`: outside any part); Milestone 12. */
  const tagsByPart = ref<Record<string, string[]>>({})
  const cards = computed(() => [...opened.value.filter((file) => !pinned.value.includes(file)), ...pinned.value])

  async function load(file: ProjectPath): Promise<void> {
    const page = await api.readReference(file)
    if (page.ok) pages.value = { ...pages.value, [file]: page.value }
  }

  async function reset(): Promise<void> {
    opened.value = []
    pages.value = {}
    pinned.value = project.project ? await api.getShelf() : []
    tagsByPart.value = project.project ? await api.getShelfTags() : {}
    await Promise.all(pinned.value.map(load))
  }

  /** Opens a page on the shelf (and shows the shelf), without touching the editor. */
  async function open(file: ProjectPath): Promise<void> {
    visible.value = true
    if (!cards.value.includes(file)) opened.value = [file, ...opened.value]
    await load(file)
  }

  const save = (): Promise<void> => api.setShelf([...pinned.value])

  async function pin(file: ProjectPath): Promise<void> {
    if (pinned.value.includes(file)) return
    opened.value = opened.value.filter((entry) => entry !== file)
    pinned.value = [...pinned.value, file]
    await save()
  }

  async function unpin(file: ProjectPath): Promise<void> {
    pinned.value = pinned.value.filter((entry) => entry !== file)
    await save()
  }

  async function close(file: ProjectPath): Promise<void> {
    opened.value = opened.value.filter((entry) => entry !== file)
    if (pinned.value.includes(file)) await unpin(file)
  }

  /** Moves a pinned page to `index` among the pinned pages. */
  async function moveTo(file: ProjectPath, index: number): Promise<void> {
    const others = pinned.value.filter((entry) => entry !== file)
    if (!pinned.value.includes(file) || index < 0 || index > others.length) return
    others.splice(index, 0, file)
    pinned.value = others
    await save()
  }

  const chosenTags = (part: string): string[] => tagsByPart.value[part] ?? []

  async function chooseTags(part: string, tags: string[]): Promise<void> {
    tagsByPart.value = { ...tagsByPart.value, [part]: tags }
    await api.chooseShelfTags(part, [...tags])
  }

  async function refreshAbout(chapter: ProjectPath | null): Promise<void> {
    aboutChapter.value = chapter ? await api.cardsAbout(chapter) : []
  }

  api.onEvent((event) => {
    if (event.kind === 'references-changed') void Promise.all(cards.value.map(load))
  })

  return {
    visible,
    pinned,
    opened,
    pages,
    aboutChapter,
    cards,
    reset,
    open,
    pin,
    unpin,
    close,
    moveTo,
    refreshAbout,
    chosenTags,
    chooseTags,
  }
})
