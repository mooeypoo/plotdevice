<script setup lang="ts">
import type { OutlineView } from '@plotdevice/contracts'
import { cardsInOrder } from '@plotdevice/presentation'
import { computed } from 'vue'
import OutlineCard from './OutlineCard.vue'

const props = defineProps<{ outline: OutlineView }>()
const cards = computed(() => cardsInOrder(props.outline))
</script>

<template>
  <div class="cards-grid" data-testid="cards">
    <OutlineCard v-for="card in cards" :key="`${card.path.section}/${card.path.path.join('/')}`" :item="card.item" :at="card.path" :label="card.section" />
  </div>
</template>
