<script setup lang="ts">
import { inlineSpans } from '@plotdevice/presentation'
import { computed } from 'vue'

// Formatted as spans of text: author text is never rendered as HTML.
const props = defineProps<{ text: string }>()
const spans = computed(() => inlineSpans(props.text))
</script>

<template>
  <span class="inline-text" dir="auto"
    ><template v-for="(span, index) in spans" :key="index"
      ><strong v-if="span.kind === 'strong'">{{ span.text }}</strong
      ><em v-else-if="span.kind === 'em'">{{ span.text }}</em
      ><code v-else-if="span.kind === 'code'">{{ span.text }}</code
      ><span v-else-if="span.kind === 'link'" class="inline-link" :title="span.target">{{ span.text }}</span
      ><template v-else>{{ span.text }}</template></template
    ></span
  >
</template>
