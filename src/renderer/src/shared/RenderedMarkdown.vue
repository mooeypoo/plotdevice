<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { LinkTargetDto } from '../../../contract/dtos'
import type { LinkAt } from './link-at'
import { createMarkdownView, type MarkdownView } from './markdown-view'
import { screenRectOf, type ScreenRect } from './screen-rect'

const props = defineProps<{
  text: string
  linkTargets: readonly LinkTargetDto[]
  pointsHere?: (link: LinkAt) => boolean
}>()
const emit = defineEmits<{
  openLink: [link: LinkAt]
  /** Asks to peek at a project link: after hovering it, or by keyboard (focus the card). */
  peek: [link: LinkAt, near: ScreenRect, byKeyboard: boolean]
  /** The pointer left the link; the peek may close after a short grace. */
  peekEnd: []
}>()
/** How long the pointer rests on a link before its peek opens. */
const PEEK_DELAY_MS = 500
let peekTimer: ReturnType<typeof setTimeout> | undefined

/** The project link an event happened on, as the renderer marks it. */
function projectLink(
  target: EventTarget | null
): { link: LinkAt; anchor: HTMLElement } | undefined {
  if (!(target instanceof Element)) return undefined
  const anchor = target.closest<HTMLElement>('a.markdown-link')
  if (anchor === null) return undefined
  const value = anchor.dataset['markdownTarget']
  if (value === undefined) return undefined
  return anchor.dataset['markdownKind'] === 'wiki'
    ? { link: { kind: 'wiki', target: value }, anchor }
    : { link: { kind: 'markdown', address: value }, anchor }
}

function cancelPeek(): void {
  if (peekTimer !== undefined) clearTimeout(peekTimer)
  peekTimer = undefined
}

function hover(event: MouseEvent): void {
  const found = projectLink(event.target)
  if (found === undefined) return
  cancelPeek()
  peekTimer = setTimeout(() => {
    peekTimer = undefined
    emit('peek', found.link, screenRectOf(found.anchor), false)
  }, PEEK_DELAY_MS)
}

function leave(event: MouseEvent): void {
  const from = projectLink(event.target)
  if (from === undefined || from.anchor.contains(event.relatedTarget as Node | null)) return
  cancelPeek()
  emit('peekEnd')
}

function keydown(event: KeyboardEvent): void {
  if (event.key !== 'Enter' || !event.shiftKey || !(event.ctrlKey || event.metaKey)) return
  const found = projectLink(event.target)
  if (found === undefined) return
  event.preventDefault()
  emit('peek', found.link, screenRectOf(found.anchor), true)
}
const host = ref<HTMLElement | null>(null)
let view: MarkdownView | undefined

onMounted(() => {
  if (host.value === null) return
  view = createMarkdownView(host.value, {
    text: props.text,
    linkTargets: props.linkTargets,
    onOpenLink: (link) => {
      emit('openLink', link)
    }
  })
  if (props.pointsHere !== undefined) view.highlight(props.pointsHere)
})
watch(
  () => props.text,
  (text) => view?.setText(text)
)
watch(
  () => props.linkTargets,
  (targets) => view?.setLinkTargets(targets)
)
watch(
  () => props.pointsHere,
  (pointsHere) => {
    if (pointsHere !== undefined) view?.highlight(pointsHere)
  }
)
onBeforeUnmount(() => {
  cancelPeek()
  view?.destroy()
})
</script>

<template>
  <div
    ref="host"
    class="view"
    dir="auto"
    @mouseover="hover"
    @mouseout="leave"
    @keydown="keydown"
  ></div>
</template>

<style scoped>
.view {
  font-size: 15px;
  font-family: var(--font-prose);
  line-height: 1.72;
  color: var(--prose);
  overflow-wrap: anywhere;
}
.view :deep(:first-child) {
  margin-top: 0;
}
.view :deep(h1),
.view :deep(h2),
.view :deep(h3),
.view :deep(h4),
.view :deep(h5),
.view :deep(h6) {
  margin-block: 1.5em 0.5em;
  line-height: 1.3;
  color: var(--text-strong);
}
.view :deep(h1) {
  font-size: 1.6em;
}
.view :deep(h2) {
  font-size: 1.3em;
}
.view :deep(h3),
.view :deep(h4),
.view :deep(h5),
.view :deep(h6) {
  font-size: 1.1em;
}
.view :deep(ul),
.view :deep(ol) {
  padding-inline-start: 1.5em;
}
.view :deep(blockquote) {
  margin-inline: 0;
  padding-inline-start: 1em;
  border-inline-start: 2px solid var(--line-strong);
  color: var(--text-dim);
}
.view :deep(pre) {
  overflow-x: auto;
  padding: 10px;
  background: var(--bg-sunken);
  direction: ltr;
  unicode-bidi: isolate;
}
.view :deep(code) {
  font-family: var(--font-mono);
  font-size: 0.85em;
  direction: ltr;
  unicode-bidi: isolate;
}
.view :deep(table) {
  display: block;
  overflow-x: auto;
  border-collapse: collapse;
}
.view :deep(th),
.view :deep(td) {
  padding: 4px 8px;
  border: 1px solid var(--line-strong);
}
.view :deep(.markdown-current) {
  background: var(--accent-soft);
  border-radius: 4px;
}
.view :deep(.markdown-link) {
  color: var(--link-other);
  text-decoration: underline dotted;
  text-underline-offset: 3px;
}
.view :deep(.markdown-link-character) {
  color: var(--link-character);
}
.view :deep(.markdown-link-location) {
  color: var(--link-location);
}
.view :deep(.markdown-link-note),
.view :deep(.markdown-link-outline) {
  color: var(--link-note);
}
.view :deep(.markdown-link-missing) {
  color: var(--link-missing);
}
.view :deep(.markdown-link-ambiguous) {
  color: var(--warning);
}
</style>
