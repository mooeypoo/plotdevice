<script setup lang="ts">
import { useEditorStore } from '../../app/editor-store'

const editor = useEditorStore()
</script>

<template>
  <aside class="inspector" aria-label="Inspector">
    <header>
      <span class="eyebrow">Outline</span>
    </header>
    <div class="note">
      <p>
        Your plan, in your words. Link chapters and characters with [[their names]]; lines without
        links are fine too.
      </p>
      <p>
        While you write a chapter, this outline shows in the Outline tab beside it (Ctrl+Shift+O),
        with the lines about that chapter highlighted.
      </p>
    </div>
    <p class="hint">Saved to {{ editor.entry?.path }}</p>
  </aside>
</template>

<style scoped src="./inspector.css"></style>
<style scoped>
.hint {
  color: var(--text-muted);
}
</style>
