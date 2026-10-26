<script setup lang="ts">
// The interface's few icons, drawn inline so they take the text colour. Always decorative: the
// button around an icon carries its name (aria-label and title).
export type IconName =
  | 'chevron'
  | 'menu'
  | 'chapters'
  | 'references'
  | 'pilcrow'
  | 'more'
  | 'link'
  | 'pin'
  | 'bold'
  | 'italic'
  | 'heading'
  | 'quote'
  | 'bulletList'
  | 'orderedList'
  | 'sceneBreak'
  | 'paragraphLtr'
  | 'paragraphRtl'
  | 'phraseLtr'
  | 'phraseRtl'
  | 'phraseClear'

defineProps<{ name: IconName }>()
</script>

<template>
  <svg
    class="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path v-if="name === 'chevron'" d="M6 9l6 6 6-6" />
    <path v-else-if="name === 'menu'" d="M4 7h16M4 12h16M4 17h16" />
    <template v-else-if="name === 'chapters'">
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M9 4v16" />
    </template>
    <template v-else-if="name === 'references'">
      <path d="M3 5.5A1.5 1.5 0 0 1 4.5 4H10a2 2 0 0 1 2 2v14a1.5 1.5 0 0 0-1.5-1.5h-6A1.5 1.5 0 0 1 3 17z" />
      <path d="M21 5.5A1.5 1.5 0 0 0 19.5 4H14a2 2 0 0 0-2 2v14a1.5 1.5 0 0 1 1.5-1.5h6A1.5 1.5 0 0 0 21 17z" />
    </template>
    <path v-else-if="name === 'pilcrow'" d="M13 4v16M17 4v16M19 4H9.5a4.5 4.5 0 0 0 0 9H13" />
    <template v-else-if="name === 'more'">
      <circle cx="5" cy="12" r="1.2" fill="currentColor" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
      <circle cx="19" cy="12" r="1.2" fill="currentColor" />
    </template>
    <template v-else-if="name === 'link'">
      <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" />
      <path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />
    </template>
    <path v-else-if="name === 'pin'" d="M9 4h6l-1 5 3 3v2H7v-2l3-3-1-5zM12 14v6" />
    <path v-else-if="name === 'bold'" d="M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z" stroke-width="2.2" />
    <path v-else-if="name === 'italic'" d="M11 5h7M6 19h7M15 5l-6 14" />
    <path v-else-if="name === 'heading'" d="M6 5v14M17 5v14M6 12h11" />
    <path v-else-if="name === 'quote'" d="M6 7h4v4c0 3-1.5 5-4 6M14 7h4v4c0 3-1.5 5-4 6" />
    <template v-else-if="name === 'bulletList'">
      <path d="M10 7h10M10 12h10M10 17h10" />
      <circle cx="5" cy="7" r="1.1" fill="currentColor" />
      <circle cx="5" cy="12" r="1.1" fill="currentColor" />
      <circle cx="5" cy="17" r="1.1" fill="currentColor" />
    </template>
    <path v-else-if="name === 'orderedList'" d="M11 7h9M11 12h9M11 17h9M5 5v4M4 14.5a1.5 1.5 0 0 1 3 0c0 1-3 2.3-3 3.5h3" />
    <path
      v-else-if="name === 'sceneBreak'"
      d="M5 10v4M3.3 11l3.4 2M3.3 13l3.4-2M12 10v4M10.3 11l3.4 2M10.3 13l3.4-2M19 10v4M17.3 11l3.4 2M17.3 13l3.4-2"
    />
    <path v-else-if="name === 'paragraphLtr'" d="M4 6h16M4 10h10M4 16h14M15 13l3 3-3 3" />
    <path v-else-if="name === 'paragraphRtl'" d="M4 6h16M10 10h10M20 16H6M9 13l-3 3 3 3" />
    <path v-else-if="name === 'phraseLtr'" d="M5 5h8M9 5v8M5 18h13M15 15l3 3-3 3" />
    <path v-else-if="name === 'phraseRtl'" d="M11 5h8M15 5v8M19 18H6M9 15l-3 3 3 3" />
    <path v-else-if="name === 'phraseClear'" d="M8 5h8M12 5v14" />
  </svg>
</template>
