<script setup lang="ts">
import {
  PROSE_FONT_SIZE,
  PROSE_LINE_WIDTH,
  WRITING_DIRECTIONS,
  useWritingPreferencesStore
} from './writing-preferences-store'
import { useUiLanguageStore } from './ui-language-store'
import RangeField from '../shared/RangeField.vue'
import SelectField from '../shared/SelectField.vue'
import SwitchField from '../shared/SwitchField.vue'
import { useChromePresentation } from '../shared/use-chrome-presentation'
import { computed } from 'vue'
import { APPEARANCE_POPOVER_ID } from './appearance-popover'

const preferences = useWritingPreferencesStore()
const language = useUiLanguageStore()
const { formatNumber } = useChromePresentation()

const directionLabels = {
  auto: 'appearance-direction-auto',
  ltr: 'appearance-direction-ltr',
  rtl: 'appearance-direction-rtl'
} as const

const directionOptions = computed(() =>
  WRITING_DIRECTIONS.map((direction) => ({
    value: direction,
    label: language.t(directionLabels[direction])
  }))
)
</script>

<template>
  <section
    :id="APPEARANCE_POPOVER_ID"
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
      <RangeField
        id="prose-size"
        v-model="preferences.fontSize"
        :min="PROSE_FONT_SIZE.min"
        :max="PROSE_FONT_SIZE.max"
        autofocus
      />
    </div>
    <div class="control">
      <label for="prose-width">{{ language.t('appearance-width') }}</label>
      <output for="prose-width">{{
        language.t('appearance-characters', formatNumber(preferences.lineWidth))
      }}</output>
      <RangeField
        id="prose-width"
        v-model="preferences.lineWidth"
        :min="PROSE_LINE_WIDTH.min"
        :max="PROSE_LINE_WIDTH.max"
      />
    </div>
    <div class="control">
      <label for="prose-direction">{{ language.t('appearance-direction') }}</label>
      <SelectField
        id="prose-direction"
        :model-value="preferences.writingDirection"
        :options="directionOptions"
        @update:model-value="preferences.setWritingDirection($event)"
      />
    </div>
    <SwitchField
      id="fade-while-typing"
      class="toggle"
      :model-value="preferences.fadeWhileTyping"
      @update:model-value="preferences.setFadeWhileTyping($event)"
    >
      {{ language.t('appearance-fade') }}
    </SwitchField>
    <fieldset class="experimental">
      <legend>{{ language.t('appearance-experimental') }}</legend>
      <SwitchField
        id="capture-beats"
        class="toggle"
        :model-value="preferences.captureBeats"
        @update:model-value="preferences.setCaptureBeats($event)"
      >
        {{ language.t('appearance-capture') }}
      </SwitchField>
      <SwitchField
        id="capture-links-chapter"
        class="toggle nested"
        :model-value="preferences.captureLinksChapter"
        :disabled="!preferences.captureBeats"
        @update:model-value="preferences.setCaptureLinksChapter($event)"
      >
        {{ language.t('appearance-capture-link') }}
      </SwitchField>
    </fieldset>
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
.experimental {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding-block: 8px;
  padding-inline: 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
}

.experimental legend {
  padding-inline: 4px;
  color: var(--text-muted);
  font-size: 11px;
}

.toggle {
  margin-block-end: var(--space-4);
}

.experimental .toggle {
  margin-block-end: 0;
}

.toggle.nested {
  padding-inline-start: var(--space-5);
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
  box-shadow: var(--shadow-popover);
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

.range-field,
.select-field {
  grid-column: 1 / -1;
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
