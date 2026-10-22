<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { useDocumentTabsStore } from '../../app/document-tabs-store'
import { usePaletteStore } from '../../app/palette-store'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { usePaletteCommands, type PaletteItem } from '../../app/use-palette-commands'
import { isolate } from '../../shared/isolate'
import { useChromePresentation } from '../../shared/use-chrome-presentation'
import { createMatcher } from './palette-match'

/** Enough to choose from without a long scroll; typing narrows the rest. */
const MAX_RESULTS = 50

const palette = usePaletteStore()
const tabs = useDocumentTabsStore()
const language = useUiLanguageStore()
const chrome = useChromePresentation()
const { items } = usePaletteCommands()
const input = useTemplateRef<HTMLInputElement>('input')

const query = ref('')
const activeIndex = ref(0)
const matcher = computed(() => createMatcher(language.locale))

/** With nothing typed: open documents first, then views, layouts and commands. */
const results = computed((): PaletteItem[] => {
  if (query.value.trim() === '') {
    const open = new Set(tabs.documents.map((tab) => tab.path))
    return [
      ...items.value.filter((item) => item.path !== undefined && open.has(item.path)),
      ...items.value.filter((item) => item.kind !== 'entry')
    ].slice(0, MAX_RESULTS)
  }
  return matcher.value.filter(items.value, query.value).slice(0, MAX_RESULTS)
})
const active = computed(() => results.value[activeIndex.value])
const count = computed(() =>
  language.t('palette-count', results.value.length, chrome.formatNumber(results.value.length))
)

watch(
  () => palette.open,
  async (open) => {
    if (!open) return
    query.value = ''
    activeIndex.value = 0
    await nextTick()
    input.value?.focus()
  },
  { immediate: true }
)
watch(query, () => {
  activeIndex.value = 0
})

const optionId = (item: PaletteItem): string => `palette-option-${item.id.replace(/[^\w-]/gu, '_')}`

function run(item: PaletteItem | undefined, beside: boolean): void {
  if (item === undefined) return
  const command = beside && item.runBeside !== undefined ? item.runBeside : item.run
  void palette.runAndClose(command)
}

function keydown(event: KeyboardEvent): void {
  const last = results.value.length - 1
  switch (event.key) {
    case 'ArrowDown':
      activeIndex.value = activeIndex.value >= last ? 0 : activeIndex.value + 1
      break
    case 'ArrowUp':
      activeIndex.value = activeIndex.value <= 0 ? last : activeIndex.value - 1
      break
    case 'Home':
      if (!event.ctrlKey) return
      activeIndex.value = 0
      break
    case 'End':
      if (!event.ctrlKey) return
      activeIndex.value = Math.max(0, last)
      break
    case 'Enter':
      run(active.value, event.shiftKey)
      break
    case 'Escape':
      event.stopPropagation()
      palette.close()
      break
    default:
      return
  }
  event.preventDefault()
  void nextTick(() => {
    const element =
      active.value === undefined ? null : document.getElementById(optionId(active.value))
    element?.scrollIntoView({ block: 'nearest' })
  })
}
</script>

<template>
  <div v-if="palette.open" class="backdrop" @pointerdown.self="palette.close()">
    <div class="palette" role="dialog" aria-modal="true" :aria-label="language.t('palette-title')">
      <input
        ref="input"
        v-model="query"
        type="text"
        role="combobox"
        dir="auto"
        aria-autocomplete="list"
        aria-expanded="true"
        aria-controls="palette-options"
        :aria-activedescendant="active ? optionId(active) : undefined"
        :aria-label="language.t('palette-title')"
        :placeholder="language.t('palette-placeholder')"
        @keydown="keydown"
      />
      <ul id="palette-options" role="listbox" :aria-label="language.t('palette-title')">
        <li
          v-for="(item, index) in results"
          :id="optionId(item)"
          :key="item.id"
          role="option"
          :aria-selected="index === activeIndex"
          :class="{ active: index === activeIndex }"
          @pointermove="activeIndex = index"
          @click="run(item, $event.shiftKey)"
        >
          <span class="title" dir="auto">{{ item.title }}</span>
          <span class="detail" dir="auto">{{ item.detail }}</span>
        </li>
      </ul>
      <p v-if="results.length === 0" class="empty">{{ language.t('palette-empty') }}</p>
      <footer>
        <span role="status" aria-live="polite">{{ count }}</span>
        <span v-if="active?.runBeside">{{
          language.t('palette-beside-hint', isolate('Shift+Enter'))
        }}</span>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  z-index: 60;
  inset: 0;
  display: flex;
  justify-content: center;
  padding-top: 12vh;
  background: rgb(0 0 0 / 35%);
}

.palette {
  display: flex;
  flex-direction: column;
  width: min(560px, calc(100vw - 32px));
  max-height: 70vh;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
  box-shadow: 0 16px 40px rgb(0 0 0 / 50%);
  align-self: flex-start;
}

input {
  margin: 10px;
  padding: 8px 10px;
  font-size: 15px;
}

ul {
  flex: 1;
  min-height: 0;
  margin: 0;
  padding: 0 6px;
  overflow-y: auto;
  list-style: none;
}

li {
  display: flex;
  gap: 12px;
  align-items: baseline;
  justify-content: space-between;
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
}

li.active {
  background: var(--accent-soft);
}

.title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail {
  flex-shrink: 0;
  color: var(--text-muted);
  font-size: 12px;
}

.empty {
  margin: 4px 16px 10px;
  color: var(--text-muted);
}

footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 16px;
  border-top: 1px solid var(--line);
  color: var(--text-muted);
  font-size: 12px;
}
</style>
