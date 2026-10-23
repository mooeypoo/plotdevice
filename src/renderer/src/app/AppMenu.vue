<script setup lang="ts">
import { computed } from 'vue'
import { UI_LANGUAGES } from '../../../i18n/locales'
import MenuButton from '../shared/MenuButton.vue'
import type { MenuItem } from '../shared/menu-item'
import LayoutDialog from '../workbench/shell/LayoutDialog.vue'
import { useLayoutActions } from '../workbench/shell/use-layout-actions'
import { openAppearance } from './appearance-popover'
import { useUiLanguageStore } from './ui-language-store'
import { useWorkspaceStore } from './workspace-store'

/**
 * The top bar's one ⋯: everything needed rarely, one step away (D2) — the interface language,
 * appearance, layouts and closing the project.
 */
const language = useUiLanguageStore()
const workspace = useWorkspaceStore()
const layouts = useLayoutActions()

const items = computed((): MenuItem[] => [
  {
    key: 'language',
    label: language.t('language-label'),
    run: () => undefined,
    children: [
      ...UI_LANGUAGES.map((option): MenuItem => ({
        key: option.locale,
        label: option.name,
        checked: language.locale === option.locale,
        run: () => void language.change(option.locale)
      })),
      ...(language.locale === 'he'
        ? [
            {
              key: 'incomplete',
              label: language.t('language-incomplete'),
              disabled: true,
              separator: true,
              run: () => undefined
            }
          ]
        : [])
    ]
  },
  { key: 'appearance', label: language.t('app-menu-appearance'), run: openAppearance },
  {
    key: 'layout',
    label: language.t('workbench-layout-label'),
    run: () => undefined,
    children: layouts.items.value
  },
  {
    key: 'close',
    label: language.t('close-project'),
    separator: true,
    run: () => {
      void workspace.backToWelcome()
    }
  }
])
</script>

<template>
  <span class="app-menu">
    <MenuButton :label="language.t('app-menu-label')" :items="items" />
    <LayoutDialog :actions="layouts" />
    <p v-if="language.errorMessage" class="notice" role="alert">{{ language.errorMessage }}</p>
  </span>
</template>

<style scoped>
.app-menu {
  position: relative;
  display: inline-flex;
}

.notice {
  position: absolute;
  top: 100%;
  inset-inline-end: 0;
  max-inline-size: 24rem;
  margin: var(--space-2) 0 0;
  color: var(--warning);
  font-size: var(--text-small);
}
</style>
