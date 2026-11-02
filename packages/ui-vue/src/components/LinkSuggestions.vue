<script setup lang="ts">
import type { LinkTarget } from '@plotdevice/presentation'
import type { LinkQuery } from '../composables/use-link-suggestions'
import { useSettingsStore } from '../stores/settings'

// The pages offered under an `@name` being typed. The editor keeps the keyboard; a click chooses.
defineProps<{ query: LinkQuery; offered: LinkTarget[]; selected: number }>()
const emit = defineEmits<{ choose: [target: LinkTarget] }>()
const t = useSettingsStore().t
</script>

<template>
  <ul
    class="item-suggestions"
    role="listbox"
    :aria-label="t('link-search')"
    data-testid="item-suggestions"
    :style="{ left: `${query.x}px`, top: `${query.y + 4}px` }"
  >
    <li
      v-for="(target, index) in offered"
      :key="target.file"
      role="option"
      :aria-selected="index === selected"
      :class="{ selected: index === selected }"
      @mousedown.prevent
      @click="emit('choose', target)"
    >
      <span dir="auto">{{ target.title }}</span>
      <span class="secondary">{{ t(`kind-${target.kind}`) }}</span>
    </li>
  </ul>
</template>
