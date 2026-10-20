<script setup lang="ts">
// The app's mark: the icon's nib and its line, then "Plot·Device" in the prose face.
</script>

<template>
  <span class="brand">
    <svg class="nib" viewBox="150 70 250 380" aria-hidden="true" focusable="false">
      <path
        d="M256 84 L 334 194 C 341 205 339 220 330 229 L 256 304 L 182 229 C 173 220 171 205 178 194 Z"
        fill="currentColor"
      />
      <path d="M256 166 L 256 304" stroke="var(--bg)" stroke-width="12" stroke-linecap="round" />
      <circle cx="256" cy="166" r="20" fill="var(--bg)" />
      <path
        d="M256 304 C 256 350, 194 356, 172 390 C 150 424, 212 444, 268 416 C 318 391, 348 404, 386 426"
        fill="none"
        stroke="var(--accent)"
        stroke-width="24"
        stroke-linecap="round"
      />
    </svg>
    <span class="wordmark">Plot<span class="dot">·</span>Device</span>
  </span>
</template>

<style scoped>
.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.35em;
  color: var(--text-strong);
}

.nib {
  flex-shrink: 0;
  width: 0.72em;
  height: 1.1em;
}
</style>
