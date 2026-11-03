<script setup lang="ts">
import type { AboutView } from '@plotdevice/contracts'
import { computed, ref } from 'vue'
import { useApi } from '../api'
import { AUTHOR_SITE, COFFEE, documentationFor } from '../links'
import { useSettingsStore } from '../stores/settings'
import { downloadFor, useUpdatesStore } from '../stores/updates'
import BrandMark from './BrandMark.vue'

const api = useApi()
const settings = useSettingsStore()
const t = settings.t
const dialog = ref<HTMLDialogElement | null>(null)
const about = ref<AboutView | null>(null)
const updates = useUpdatesStore()
// The coffee sentence, split around its link so each language can place the link where it reads well.
const coffee = computed(() => t('about-coffee', '$1').split('$1'))

async function show(): Promise<void> {
  about.value ??= await api.getAbout()
  dialog.value?.showModal()
}

defineExpose({ show })
</script>

<template>
  <dialog ref="dialog" class="dialog about" data-testid="about" aria-labelledby="about-title">
    <header class="about-head">
      <BrandMark class="about-mark" />
      <div>
        <h2 id="about-title">{{ t('app-name') }}</h2>
        <p v-if="about" class="secondary" data-testid="about-version">{{ t('app-version', about.version) }}</p>
      </div>
    </header>
    <div class="about-update" role="status" data-testid="about-update">
      <button type="button" :disabled="updates.checked?.kind === 'checking'" data-testid="check-for-updates" @click="updates.check()">
        {{ t('update-check') }}
      </button>
      <p v-if="updates.checked?.kind === 'checking'" class="secondary">{{ t('update-checking') }}</p>
      <p v-else-if="updates.checked?.kind === 'newest'" class="secondary">{{ t('update-newest') }}</p>
      <p v-else-if="updates.checked?.kind === 'failed'" class="secondary">{{ t('update-failed') }}</p>
      <p v-else-if="updates.checked?.kind === 'newer'">
        {{ t('update-is-out', updates.checked.update.version) }}
        <a :href="updates.checked.update.notes" target="_blank" rel="noreferrer">{{ t('update-whats-new') }}</a> ·
        <a :href="downloadFor(updates.checked.update, settings.locale)" target="_blank" rel="noreferrer">{{ t('update-download') }}</a>
      </p>
    </div>
    <p data-testid="about-author">
      {{ t('about-made-by') }} <a :href="AUTHOR_SITE" target="_blank" rel="noreferrer" dir="ltr">Moriel Schottlender</a>
    </p>
    <p>
      <a :href="documentationFor(settings.locale)" target="_blank" rel="noreferrer" data-testid="about-documentation">{{
        t('help-documentation')
      }}</a>
    </p>
    <p>{{ t('about-license') }}</p>
    <p>{{ t('about-yours') }}</p>
    <p data-testid="about-coffee">
      {{ coffee[0] }}<a :href="COFFEE" target="_blank" rel="noreferrer">{{ t('about-coffee-link') }}</a
      >{{ coffee[1] }}
    </p>
    <details v-if="about">
      <summary>{{ t('about-credits', about.thirdParty.length) }}</summary>
      <ul class="credits" data-testid="credits">
        <li v-for="entry in about.thirdParty" :key="`${entry.name}@${entry.version}`" dir="ltr">
          {{ entry.name }} {{ entry.version }} <span class="secondary">({{ entry.license }})</span>
        </li>
      </ul>
    </details>
    <details v-if="about?.licenseText">
      <summary>{{ t('about-full-license') }}</summary>
      <pre class="license" dir="ltr" lang="en">{{ about.licenseText }}</pre>
    </details>
    <form method="dialog" class="actions">
      <button type="submit" class="primary">{{ t('versions-close') }}</button>
    </form>
  </dialog>
</template>
