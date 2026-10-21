<script setup lang="ts">
import {
  PROSE_FONT_SIZE,
  PROSE_LINE_WIDTH,
  useWritingPreferencesStore
} from './writing-preferences-store'
import { useUiLanguageStore } from './ui-language-store'
import { useChromePresentation } from '../shared/use-chrome-presentation'

const preferences = useWritingPreferencesStore()
const language = useUiLanguageStore()
const { formatNumber } = useChromePresentation()
</script>

<template>
  <button
    type="button"
    class="appearance-trigger quiet"
    popovertarget="writing-appearance"
    :aria-label="language.t('appearance-heading')"
    :title="language.t('appearance-heading')"
  >
    <span class="sample" aria-hidden="true">Aa</span>
    {{ language.t('appearance-trigger') }}
  </button>
  <section
    id="writing-appearance"
    popover
    class="appearance-panel"
    aria-labelledby="writing-appearance-title"
  >
    <header>
      <h2 id="writing-appearance-title">{{ language.t('appearance-heading') }}</h2>
      <button
        type="button"
        class="quiet close"
        popovertarget="writing-appearance"
        popovertargetaction="hide"
        :aria-label="language.t('appearance-close-label')"
      >
        {{ language.t('appearance-close') }}
      </button>
    </header>
    <p class="hint">{{ language.t('appearance-hint') }}</p>
    <div class="control">
      <label for="prose-size">{{ language.t('appearance-size') }}</label>
      <output for="prose-size">{{
        language.t('appearance-pixels', formatNumber(preferences.fontSize))
      }}</output>
      <input
        id="prose-size"
        v-model.number="preferences.fontSize"
        type="range"
        :min="PROSE_FONT_SIZE.min"
        :max="PROSE_FONT_SIZE.max"
        step="1"
        autofocus
      />
    </div>
    <div class="control">
      <label for="prose-width">{{ language.t('appearance-width') }}</label>
      <output for="prose-width">{{
        language.t('appearance-characters', formatNumber(preferences.lineWidth))
      }}</output>
      <input
        id="prose-width"
        v-model.number="preferences.lineWidth"
        type="range"
        :min="PROSE_LINE_WIDTH.min"
        :max="PROSE_LINE_WIDTH.max"
        step="1"
      />
    </div>
    <footer>
      <span>{{ language.t('appearance-all-projects') }}</span>
      <button type="button" class="quiet reset" @click="preferences.resetTypography()">
        {{ language.t('appearance-reset') }}
      </button>
    </footer>
    <p v-if="preferences.storageNotice" class="notice" role="status">
      {{ preferences.storageNotice }}
    </p>
  </section>
</template>

<style scoped>
.appearance-trigger {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 2px 6px;
  font-size: 12px;
}

.sample {
  color: var(--accent);
  font-family: var(--font-prose);
  font-size: 15px;
}

.appearance-panel {
  position: fixed;
  inset: auto;
  inset-inline-end: 18px;
  bottom: 40px;
  width: min(320px, calc(100vw - 36px));
  max-height: calc(100vh - 58px);
  overflow-y: auto;
  margin: 0;
  padding: 18px;
  border: 1px solid var(--line-strong);
  border-top: 2px solid var(--accent);
  border-radius: var(--radius);
  background: var(--panel);
  color: var(--text);
  box-shadow: 0 12px 40px #0006;
  font: 13px var(--font-ui);
  white-space: normal;
}

header,
footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 500;
}

.close,
.reset {
  padding: 3px 5px;
  font-size: 12px;
}

.hint,
footer {
  color: var(--text-muted);
  font-size: 12px;
}

.hint {
  margin: 8px 0 22px;
  line-height: 1.5;
}

.control {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  margin-bottom: 20px;
}

output {
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

input {
  grid-column: 1 / -1;
  width: 100%;
  margin: 0;
  accent-color: var(--accent);
  cursor: pointer;
}

footer {
  padding-top: 12px;
  border-top: 1px solid var(--line);
}

.notice {
  margin: 12px 0 0;
  color: var(--warning);
  line-height: 1.5;
}
</style>
