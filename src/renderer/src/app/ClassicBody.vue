<script setup lang="ts">
import { useLayoutStore } from './layout-store'
import RightPanel from './RightPanel.vue'
import SidePanel from './SidePanel.vue'

const layout = useLayoutStore()
</script>

<!-- The fixed panels from before the workbench, kept behind View > Classic Layout until W6. -->
<template>
  <div class="classic-body">
    <SidePanel v-if="layout.binderOpen && !layout.focusMode" />
    <main class="main">
      <slot />
    </main>
    <RightPanel v-if="layout.inspectorOpen && !layout.focusMode" />
  </div>
</template>

<style scoped>
.classic-body {
  display: flex;
  flex: 1;
  min-height: 0;
}

.main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.main :deep(.pane) {
  flex: 1;
  min-height: 0;
}
</style>
