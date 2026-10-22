<script setup lang="ts">
import { computed, nextTick, useTemplateRef, watch } from 'vue'
import { placeOf } from '../../app/entry-owners'
import { usePeekStore } from '../../app/peek-store'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { uiDirection } from '../../../../i18n/locales'
import { isolate } from '../../shared/isolate'
import EntryCard from './EntryCard.vue'
import { peekPosition } from './peek-position'

const peek = usePeekStore()
const language = useUiLanguageStore()
const layer = useTemplateRef<HTMLElement>('layer')

const title = computed(() => (peek.path === null ? '' : (placeOf(peek.path)?.title ?? peek.path)))
const position = computed(() =>
  peek.anchor === null
    ? undefined
    : peekPosition(peek.anchor, {
        width: window.innerWidth,
        height: window.innerHeight,
        rtl: uiDirection(language.locale) === 'rtl'
      })
)

// A keyboard peek moves focus into the card so its actions can be reached.
watch(
  () => [peek.path, peek.takesFocus] as const,
  async ([path, takesFocus]) => {
    if (path === null || !takesFocus) return
    await nextTick()
    layer.value?.focus()
  }
)

function keydown(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return
  event.preventDefault()
  event.stopPropagation()
  peek.close({ restoreFocus: true })
}

function focusout(event: FocusEvent): void {
  if (!peek.takesFocus) return
  if (
    !(event.relatedTarget instanceof Node) ||
    layer.value?.contains(event.relatedTarget) !== true
  ) {
    peek.close()
  }
}
</script>

<template>
  <div
    v-if="peek.path !== null && position"
    ref="layer"
    class="peek"
    role="dialog"
    tabindex="-1"
    :aria-label="language.t('cards-peek-label', isolate(title))"
    :style="position"
    @pointerenter="peek.enterCard()"
    @pointerleave="peek.leaveCard()"
    @keydown="keydown"
    @focusout="focusout"
  >
    <!-- Links inside a peek don't peek again, so the card under the pointer never changes. -->
    <EntryCard :key="peek.path" :path="peek.path" :peekable="false" />
  </div>
</template>

<style scoped>
.peek {
  position: fixed;
  z-index: 50;
  width: min(360px, calc(100vw - 16px));
  max-height: min(420px, calc(100vh - 16px));
  overflow-y: auto;
  border-radius: 6px;
  box-shadow: 0 10px 28px rgb(0 0 0 / 45%);
}

.peek:focus-visible {
  outline: 2px solid var(--accent);
}
</style>
