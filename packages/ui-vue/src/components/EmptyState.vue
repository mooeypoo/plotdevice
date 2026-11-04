<script setup lang="ts">
// Where there is nothing yet (Milestone 17): one plain explanation and one next step, with a small
// sketch of what will be there: a board, or a page card.
defineProps<{ title: string; text: string; action: string; sketch: 'board' | 'cards'; testid?: string; actionTestid?: string }>()
const emit = defineEmits<{ act: [] }>()
</script>

<template>
  <section class="empty-state" :data-testid="testid">
    <div v-if="sketch === 'board'" class="empty-sketch" aria-hidden="true">
      <span v-for="(cards, column) in [2, 1, 2]" :key="column" class="sketch-column">
        <span class="sketch-heading"></span>
        <span v-for="card in cards" :key="card" class="sketch-card"></span>
      </span>
    </div>
    <div v-else class="empty-sketch" aria-hidden="true">
      <span class="sketch-page"></span>
      <span class="sketch-page sketch-new"></span>
    </div>
    <h2 class="empty-title">{{ title }}</h2>
    <p class="empty-text">{{ text }}</p>
    <button type="button" class="primary" :data-testid="actionTestid" @click="emit('act')">{{ action }}</button>
  </section>
</template>
