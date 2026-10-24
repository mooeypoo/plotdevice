<script setup lang="ts">
import { computed, ref } from 'vue'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useWarnings } from '../../app/use-warnings'
import { useWorkbenchStore } from '../../app/workbench-store'
import type { Section } from '../model/layout'
import { resizeArea, selectSection, setAreaCollapsed } from '../model/operations'
import { SHELF_SIZE } from '../model/sizes'
import { registeredView, VIEW_REGISTRY } from '../views/view-registry'
import MenuButton from '../../shared/MenuButton.vue'
import { menuGroup, type MenuItem } from '../../shared/menu-item'
import Splitter from './Splitter.vue'
import { usePlacementMenus } from './use-placement-menus'

const workbench = useWorkbenchStore()
const language = useUiLanguageStore()
const menus = usePlacementMenus()
const area = computed(() => workbench.layout.bottom)
const sections = computed(() =>
  area.value.sections.filter((section) => VIEW_REGISTRY[section.view] !== undefined)
)
/** A tab set shows one section; a stack shows them side by side. */
const shown = computed(() =>
  area.value.arrangement === 'tabs'
    ? sections.value.filter(
        (section) => section.id === (area.value.activeSection ?? sections.value[0]?.id)
      )
    : sections.value
)
const warnings = useWarnings()
/** A shelf that would only say "nothing needs attention" takes no room at all (F12). */
const empty = computed(
  () => warnings.count.value === 0 && sections.value.every((section) => section.view === 'warnings')
)
const title = (section: Section): string => language.t(registeredView(section.view).title)
const titles = computed(() => sections.value.map(title).join(' · '))
const preview = ref<number | null>(null)
const height = computed(() => preview.value ?? area.value.size)

/** With tabs, one ⋯ for the panel shown and the shelf; stacked panels keep one each. */
const shownSection = computed(() =>
  area.value.arrangement === 'tabs' ? shown.value[0] : undefined
)
const shelfMenu = computed((): MenuItem[] => {
  const section = shownSection.value
  const side = menus.areaMenu('bottom')
  return section === undefined
    ? side
    : [...menus.sectionMenu(section.id, section.view), ...menuGroup(side)]
})
const shelfMenuLabel = computed(() =>
  shownSection.value === undefined
    ? language.t('workbench-area-options')
    : language.t('workbench-panel-options', title(shownSection.value))
)

function setCollapsed(collapsed: boolean): void {
  workbench.apply((layout) => setAreaCollapsed(layout, 'bottom', collapsed))
}

function select(section: Section): void {
  workbench.apply((layout) => selectSection(layout, section.id))
}
</script>

<template>
  <section
    v-if="sections.length > 0 && !empty"
    id="workbench-bottom"
    class="shelf"
    :class="{ collapsed: area.collapsed }"
    :aria-label="language.t('workbench-panel-label', titles)"
    :style="area.collapsed ? undefined : { blockSize: `${height}px` }"
  >
    <Splitter
      v-if="!area.collapsed"
      region="bottom"
      :size="height"
      :minimum="SHELF_SIZE.min"
      :maximum="SHELF_SIZE.max"
      :label="language.t('workbench-resize-shelf')"
      controls="workbench-bottom"
      @preview="preview = $event"
      @commit="workbench.apply((layout) => resizeArea(layout, 'bottom', $event))"
    />
    <header class="shelf-header">
      <button
        type="button"
        class="quiet toggle"
        :aria-expanded="!area.collapsed"
        aria-controls="workbench-bottom-content"
        :aria-label="
          language.t(
            area.collapsed ? 'workbench-section-expand' : 'workbench-section-collapse',
            titles
          )
        "
        @click="setCollapsed(!area.collapsed)"
      >
        <span aria-hidden="true">{{ area.collapsed ? '▴' : '▾' }}</span>
      </button>
      <span v-for="section in sections" :key="section.id" class="section-title">
        <button
          v-if="area.arrangement === 'tabs'"
          type="button"
          class="quiet title"
          :class="{ selected: shown.includes(section) }"
          :aria-pressed="shown.includes(section)"
          @click="select(section)"
        >
          {{ title(section) }}
        </button>
        <span v-else class="title">{{ title(section) }}</span>
        <MenuButton
          v-if="area.arrangement !== 'tabs'"
          :label="language.t('workbench-panel-options', title(section))"
          :items="menus.sectionMenu(section.id, section.view)"
        />
      </span>
      <span class="area-tools">
        <MenuButton v-if="shelfMenu.length > 0" :label="shelfMenuLabel" :items="shelfMenu" />
      </span>
    </header>
    <div v-if="!area.collapsed" id="workbench-bottom-content" class="shelf-content">
      <div
        v-for="section in shown"
        :key="section.id"
        class="shelf-section"
        :class="`view-${section.view}`"
        :style="{ flexGrow: section.weight }"
      >
        <component :is="registeredView(section.view).component" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.shelf {
  position: relative;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  min-height: 0;
  border-top: 1px solid var(--line);
  background: var(--panel);
}

.shelf-header {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-3) var(--space-3);
}

.title {
  color: var(--text-muted);
  font-size: var(--text-small);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.title.selected {
  color: var(--text-strong);
}

.toggle {
  padding: var(--space-1) var(--space-3);
}

.section-title {
  display: inline-flex;
  gap: var(--space-1);
  align-items: center;
}

.area-tools {
  margin-inline-start: auto;
}

.shelf-content {
  display: flex;
  flex: 1;
  gap: var(--space-5);
  min-height: 0;
}

.shelf-section {
  flex-basis: 0;
  min-width: 0;
  overflow: auto;
  padding: 0 var(--space-5) var(--space-5);
}
</style>
