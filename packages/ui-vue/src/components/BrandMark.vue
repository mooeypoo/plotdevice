<script setup lang="ts">
// The logo without its tile: a pen nib whose ink line runs on as the plot (assets/brand/original).
// The nib takes the text colour and its slit the background, so it reads in both themes; with
// `draw`, the gold line draws itself once (held still for people who ask for reduced motion).
defineProps<{ draw?: boolean }>()
</script>

<template>
  <svg viewBox="120 24 330 470" aria-hidden="true">
    <path d="M256 40 L 368 196 C 378 211 375 232 362 245 L 256 352 L 150 245 C 137 232 134 211 144 196 Z" fill="var(--color-text)" />
    <path d="M256 150 L 256 352" stroke="var(--color-app)" :stroke-width="draw ? 22 : 26" stroke-linecap="round" />
    <path
      :class="{ thread: draw }"
      pathLength="1"
      d="M256 352 C 256 410, 176 404, 154 444 C 140 472, 214 474, 280 446 C 330 426, 372 432, 420 452"
      fill="none"
      stroke="var(--color-mark)"
      :stroke-width="draw ? 30 : 40"
      stroke-linecap="round"
    />
  </svg>
</template>
