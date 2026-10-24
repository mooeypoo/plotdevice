<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { useDocumentTabsStore } from '../../app/document-tabs-store'
import { useEditorStore } from '../../app/editor-store'
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
const editor = useEditorStore()
const language = useUiLanguageStore()
const chrome = useChromePresentation()
const { items } = usePaletteCommands()
const input = useTemplateRef<HTMLInputElement>('input')

const query = ref('')
const activeIndex = ref(0)
const matcher = computed(() => createMatcher(language.locale))

/** What Go to… suggests before anything is typed: the other mode, Focus, Capture, the outline. */
const SUGGESTED = new Set([
  'command:mode-plotting',
  'command:mode-writing',
  'command:toggle-focus-mode',
  'command:capture-beat',
  'command:toggle-outline',
  'command:show-outline-text'
])

interface ResultGroup {
  readonly id: string
  readonly label?: string
  readonly items: readonly PaletteItem[]
}

/**
 * With nothing typed: Recent (open documents, the one on the page first), Suggested, then
 * everything else (F13). Typing searches everything as one list.
 */
const groups = computed((): ResultGroup[] => {
  if (query.value.trim() !== '') {
    return [
      { id: 'all', items: matcher.value.filter(items.value, query.value).slice(0, MAX_RESULTS) }
    ]
  }
  const current = editor.entry?.path
  const open = [
    ...(current === undefined ? [] : [current]),
    ...tabs.documents.map((tab) => tab.path).filter((path) => path !== current)
  ]
  const recent = open.flatMap((path) => {
    const item = items.value.find((candidate) => candidate.path === path)
    return item === undefined ? [] : [item]
  })
  const others = items.value.filter((item) => item.kind !== 'entry')
  const suggested = others.filter((item) => SUGGESTED.has(item.id))
  const rest = others.filter((item) => !SUGGESTED.has(item.id))
  return [
    { id: 'recent', label: language.t('palette-group-recent'), items: recent },
    { id: 'suggested', label: language.t('palette-group-suggested'), items: suggested },
    { id: 'rest', label: language.t('palette-group-rest'), items: rest }
  ].filter((group) => group.items.length > 0)
})
/** Every result in order, as the keyboard moves through them. */
const results = computed((): PaletteItem[] =>
  groups.value.flatMap((group) => group.items).slice(0, MAX_RESULTS)
)
const indexOf = (item: PaletteItem): number => results.value.indexOf(item)
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
        <template v-for="group in groups" :key="group.id">
          <li
            v-if="group.label"
            role="group"
            class="group"
            :aria-labelledby="`palette-group-${group.id}`"
          >
            <span :id="`palette-group-${group.id}`" class="group-label">{{ group.label }}</span>
            <ul role="none">
              <li
                v-for="item in group.items"
                :id="optionId(item)"
                :key="item.id"
                role="option"
                :aria-selected="indexOf(item) === activeIndex"
                :class="{ active: indexOf(item) === activeIndex }"
                @pointermove="activeIndex = indexOf(item)"
                @click="run(item, $event.shiftKey)"
              >
                <span class="title" dir="auto">{{ item.title }}</span>
                <span class="detail" dir="auto">{{ item.detail }}</span>
              </li>
            </ul>
          </li>
          <template v-else>
            <li
              v-for="item in group.items"
              :id="optionId(item)"
              :key="item.id"
              role="option"
              :aria-selected="indexOf(item) === activeIndex"
              :class="{ active: indexOf(item) === activeIndex }"
              @pointermove="activeIndex = indexOf(item)"
              @click="run(item, $event.shiftKey)"
            >
              <span class="title" dir="auto">{{ item.title }}</span>
              <span class="detail" dir="auto">{{ item.detail }}</span>
            </li>
          </template>
        </template>
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
.group > ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.group-label {
  display: block;
  padding: var(--space-3) var(--space-5) var(--space-1);
  color: var(--text-muted);
  font-size: var(--text-caption);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.backdrop {
  position: fixed;
  z-index: 60;
  inset: 0;
  display: flex;
  justify-content: center;
  padding-top: 12vh;
  background: var(--scrim);
}

.palette {
  display: flex;
  flex-direction: column;
  width: min(560px, calc(100vw - 32px));
  max-height: 70vh;
  border: 1px solid var(--line);
  border-radius: var(--radius-field);
  background: var(--panel);
  box-shadow: var(--shadow-popover);
  align-self: flex-start;
}

input {
  margin: var(--space-3);
  padding: var(--space-3) var(--space-3);
  font-size: var(--text-title);
}

ul {
  flex: 1;
  min-height: 0;
  margin: 0;
  padding: 0 var(--space-3);
  overflow-y: auto;
  list-style: none;
}

[role='option'] {
  display: flex;
  gap: var(--space-4);
  align-items: baseline;
  justify-content: space-between;
  padding: var(--space-3) var(--space-3);
  border-radius: var(--radius-field);
  cursor: pointer;
}

[role='option'].active {
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
  font-size: var(--text-small);
}

.empty {
  margin: var(--space-2) var(--space-5) var(--space-3);
  color: var(--text-muted);
}

footer {
  display: flex;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-5);
  border-top: 1px solid var(--line);
  color: var(--text-muted);
  font-size: var(--text-small);
}
</style>
