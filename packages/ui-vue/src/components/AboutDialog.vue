<script setup lang="ts">
import type { AboutView } from '@plotdevice/contracts'
import { ref } from 'vue'
import { useApi } from '../api'
import { AUTHOR_SITE, DOCUMENTATION } from '../links'
import { useSettingsStore } from '../stores/settings'
import BrandMark from './BrandMark.vue'

const api = useApi()
const settings = useSettingsStore()
const t = settings.t
const dialog = ref<HTMLDialogElement | null>(null)
const about = ref<AboutView | null>(null)

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
    <p data-testid="about-author">
      {{ t('about-made-by') }} <a :href="AUTHOR_SITE" target="_blank" rel="noreferrer" dir="ltr">Moriel Schottlender</a>
    </p>
    <p>
      <a :href="DOCUMENTATION" target="_blank" rel="noreferrer" data-testid="about-documentation">{{ t('help-documentation') }}</a>
    </p>
    <p>{{ t('about-license') }}</p>
    <p>{{ t('about-yours') }}</p>
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
