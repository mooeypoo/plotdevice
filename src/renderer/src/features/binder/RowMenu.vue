<script setup lang="ts">
import { computed } from 'vue'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { isolate } from '../../shared/isolate'
import MenuButton from '../../shared/MenuButton.vue'
import type { MenuItem } from '../../shared/menu-item'

/** A Manuscript row's ⋯, shown on hover or focus: the things to do with a part or chapter besides opening it. */
const props = defineProps<{ title: string }>()
const emit = defineEmits<{ details: []; beside: []; reference: [] }>()

const language = useUiLanguageStore()
const items = computed((): MenuItem[] => [
  {
    key: 'details',
    label: language.t('scene-card-edit'),
    run: () => {
      emit('details')
    }
  },
  {
    key: 'beside',
    label: language.t('split-open-beside'),
    run: () => {
      emit('beside')
    }
  },
  {
    key: 'reference',
    label: language.t('reference-open-tooltip'),
    run: () => {
      emit('reference')
    }
  }
])
</script>

<template>
  <MenuButton
    class="row-menu"
    :label="language.t('tabs-actions', isolate(props.title))"
    :items="items"
  />
</template>

<style scoped>
/* One step away: its row shows the ⋯ on hover or focus (F8); see BinderRow and BinderPart. */
.row-menu {
  opacity: 0;
}

.row-menu:focus-within {
  opacity: 1;
}
</style>
