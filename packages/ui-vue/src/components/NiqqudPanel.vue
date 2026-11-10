<script setup lang="ts">
import { NIQQUD, type NiqqudReport } from '@plotdevice/editor-codemirror'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useSettingsStore } from '../stores/settings'

/**
 * The niqqud picker (ADR 0013): the Hebrew letter before the cursor, shown large, and a button for
 * each mark. Choosing a mark adds it to the letter, or takes it off; the arrow keys move to the next
 * or previous letter, so a whole word can be pointed without leaving the panel. Escape closes it.
 */
const props = defineProps<{
  /** Reads the letter before the cursor now. */
  read: () => NiqqudReport | null
  toggle: (mark: string) => void
  move: (forward: boolean) => void
}>()
const emit = defineEmits<{ close: [] }>()
const settings = useSettingsStore()
const t = settings.t

const letter = ref<NiqqudReport | null>(props.read())
const panel = ref<HTMLElement | null>(null)
const refresh = (): void => {
  letter.value = props.read()
}

/** Beside the letter, kept on screen. */
const position = computed(() => {
  const at = letter.value
  if (!at) return {}
  const width = 300
  const left = Math.max(8, Math.min(at.x - width / 2, window.innerWidth - width - 8))
  return { left: `${left}px`, top: `${Math.min(at.y + 8, window.innerHeight - 260)}px` }
})

/** A mark drawn on a dotted circle, as type specimens show them. */
const specimen = (mark: string): string => `◌${mark}`

function choose(mark: string): void {
  props.toggle(mark)
  refresh()
}

function onKey(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    emit('close')
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    // Hebrew runs right to left: Left is the next letter.
    event.preventDefault()
    props.move(event.key === 'ArrowLeft')
    refresh()
  }
}

function onOutside(event: PointerEvent): void {
  if (!panel.value?.contains(event.target as Node)) emit('close')
}

onMounted(async () => {
  await nextTick()
  panel.value?.querySelector<HTMLButtonElement>('button')?.focus()
  document.addEventListener('pointerdown', onOutside, true)
})
onBeforeUnmount(() => document.removeEventListener('pointerdown', onOutside, true))
</script>

<template>
  <div
    ref="panel"
    class="niqqud-panel"
    :class="{ floating: letter !== null }"
    :style="position"
    role="dialog"
    :aria-label="t('niqqud-title')"
    data-testid="niqqud-panel"
    @keydown="onKey"
  >
    <template v-if="letter">
      <p class="niqqud-letter" lang="he" dir="rtl" data-testid="niqqud-letter">{{ letter.letter + letter.marks.join('') }}</p>
      <div class="niqqud-marks" lang="he" dir="rtl">
        <button
          v-for="mark in NIQQUD"
          :key="mark.id"
          type="button"
          class="niqqud-mark"
          :aria-pressed="letter.marks.includes(mark.mark)"
          :aria-label="t(`niqqud-${mark.id}`)"
          :title="t(`niqqud-${mark.id}`)"
          :data-testid="`niqqud-${mark.id}`"
          @click="choose(mark.mark)"
        >
          {{ specimen(mark.mark) }}
        </button>
      </div>
      <p class="niqqud-hint secondary">{{ t('niqqud-hint') }}</p>
    </template>
    <template v-else>
      <p class="niqqud-hint" data-testid="niqqud-no-letter">{{ t('niqqud-no-letter') }}</p>
      <button type="button" @click="emit('close')">{{ t('prompt-ok') }}</button>
    </template>
  </div>
</template>
