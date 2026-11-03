<script setup lang="ts">
import type { DetailBlock } from '@plotdevice/presentation'
import InlineText from './InlineText.vue'

// A page's details as formatted text (headings, paragraphs, lists, quotes, code), never as HTML.
defineProps<{ blocks: DetailBlock[] }>()
</script>

<template>
  <div class="page-details" dir="auto">
    <template v-for="(block, index) in blocks" :key="index">
      <h3 v-if="block.kind === 'heading'" dir="auto"><InlineText :text="block.text" /></h3>
      <p v-else-if="block.kind === 'paragraph'" dir="auto"><InlineText :text="block.text" /></p>
      <blockquote v-else-if="block.kind === 'quote'" dir="auto"><InlineText :text="block.text" /></blockquote>
      <pre v-else-if="block.kind === 'code'" dir="auto">{{ block.text }}</pre>
      <component :is="block.ordered ? 'ol' : 'ul'" v-else>
        <li v-for="(item, i) in block.items" :key="i" :style="{ marginInlineStart: `${item.depth * 1.1}rem` }" dir="auto">
          <InlineText :text="item.text" />
        </li>
      </component>
    </template>
  </div>
</template>
