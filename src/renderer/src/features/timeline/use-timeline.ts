import {
  computed,
  nextTick,
  ref,
  shallowRef,
  watch,
  type ComputedRef,
  type Ref,
  type ShallowRef
} from 'vue'
import type { TimelineChapterDto, TimelineDto } from '../../../../contract/dtos'
import { useCodexStore } from '../../app/codex-store'
import { useEditorStore } from '../../app/editor-store'
import { useLayoutStore } from '../../app/layout-store'
import { useManuscriptStore } from '../../app/manuscript-store'
import { plotDeviceApi } from '../../app/plot-device-api'
import { goesBackInTime, readingRows, type GridRow, type RowMode } from './reading-grid'
import { fittingZoom, rowsRange, storyRows, type StoryRow, type Zoom } from './story-axis'

/** Reading order (as the book runs) or story order (when things happen). */
export type TimelineOrder = 'reading' | 'story'

/** The timeline view: its data, its options, and opening a chapter from it. */
export function useTimeline(): {
  readonly timeline: ShallowRef<TimelineDto | null>
  readonly order: Ref<TimelineOrder>
  readonly rows: Ref<RowMode>
  readonly minGap: Ref<number>
  readonly zoom: Ref<Zoom | null>
  readonly grid: ComputedRef<readonly GridRow[]>
  readonly backInTime: ComputedRef<readonly boolean[]>
  readonly story: ComputedRef<readonly StoryRow[]>
  readonly range: ComputedRef<{ start: number; end: number } | undefined>
  readonly undated: ComputedRef<readonly TimelineChapterDto[]>
  readonly fitZoom: (width: number) => void
  readonly open: (path: string) => Promise<void>
  readonly fixDate: (path: string) => Promise<void>
} {
  const manuscript = useManuscriptStore()
  const codex = useCodexStore()
  const editor = useEditorStore()
  const layout = useLayoutStore()
  const timeline = shallowRef<TimelineDto | null>(null)
  const order = ref<TimelineOrder>('reading')
  const rows = ref<RowMode>('threads')
  const minGap = ref(5)
  const zoom = ref<Zoom | null>(null)

  async function load(): Promise<void> {
    const result = await plotDeviceApi.current().timeline.getTimeline()
    if (result.ok) timeline.value = result.value
  }
  // The manuscript and codex reload whenever files change, here or outside; follow them.
  watch([() => manuscript.manuscript, () => codex.revision], () => void load(), { immediate: true })

  const story = computed(() =>
    timeline.value === null ? [] : storyRows(timeline.value, rows.value)
  )
  const range = computed(() => rowsRange(story.value))

  // The first time the story's span is known, pick the zoom that fits it; then it's the writer's.
  let fitWidth = 1000
  function fit(): void {
    if (zoom.value === null && range.value !== undefined) {
      zoom.value = fittingZoom(range.value, fitWidth)
    }
  }
  watch(range, fit)

  async function open(path: string): Promise<void> {
    if (await editor.open(path)) layout.mainView = 'write'
  }

  return {
    timeline,
    order,
    rows,
    minGap,
    zoom,
    grid: computed(() =>
      timeline.value === null ? [] : readingRows(timeline.value, rows.value, minGap.value)
    ),
    backInTime: computed(() =>
      timeline.value === null ? [] : goesBackInTime(timeline.value.chapters)
    ),
    story,
    range,
    undated: computed(() =>
      (timeline.value?.chapters ?? []).filter((chapter) => chapter.date.kind !== 'dated')
    ),
    fitZoom: (width) => {
      fitWidth = width
      fit()
    },
    open,
    fixDate: async (path) => {
      await open(path)
      layout.inspectorOpen = true
      layout.rightTab = 'properties'
      await nextTick()
      document.getElementById('inspector-date')?.focus()
    }
  }
}
