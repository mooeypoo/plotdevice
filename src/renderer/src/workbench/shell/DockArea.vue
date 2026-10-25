<script setup lang="ts">
import { computed, ref } from 'vue'
import { uiDirection } from '../../../../i18n/locales'
import { useUiLanguageStore } from '../../app/ui-language-store'
import { useWorkbenchStore } from '../../app/workbench-store'
import { navigateTabs } from '../../shared/tab-navigation'
import type { Section } from '../model/layout'
import { resizeArea, selectSection, setSectionCollapsed } from '../model/operations'
import { DOCK_SIZE } from '../model/sizes'
import type { DockSide } from '../model/vocabulary'
import { registeredView, VIEW_REGISTRY } from '../views/view-registry'
import MenuButton from '../../shared/MenuButton.vue'
import { menuGroup, type MenuItem } from '../../shared/menu-item'
import Splitter from './Splitter.vue'
import { usePlacementMenus } from './use-placement-menus'

const props = defineProps<{
  side: DockSide
  /** The size the page leaves for this dock; never more than the stored size. */
  size: number
  /** The largest size the page allows while resizing. */
  maximum: number
}>()

const workbench = useWorkbenchStore()
const language = useUiLanguageStore()
const direction = computed(() => uiDirection(language.locale))
const menus = usePlacementMenus()
const area = computed(() => workbench.layout[props.side])
/** Sections whose views exist; planned views appear once a feature registers them. */
const sections = computed(() =>
  area.value.sections.filter((section) => VIEW_REGISTRY[section.view] !== undefined)
)
const active = computed(
  () =>
    sections.value.find((section) => section.id === area.value.activeSection) ?? sections.value[0]
)
const title = (section: Section): string => language.t(registeredView(section.view).title)
const panelId = computed(() => `workbench-${props.side}`)
const name = computed(() =>
  active.value === undefined ? '' : language.t('workbench-panel-label', title(active.value))
)

/** Expand/Restore widens the dock for this session only, as the old reading panels did. */
const expanded = ref(false)
const preview = ref<number | null>(null)
const minimum = computed(() => Math.min(DOCK_SIZE.min, props.maximum))
const width = computed(() =>
  Math.round(
    Math.min(
      props.maximum,
      preview.value ?? (expanded.value ? Math.max(560, props.size) : props.size)
    )
  )
)

/** Tabs beyond three wait in More ▾, but the chosen one always shows (F5). */
const MAX_TABS = 3
const visibleTabs = computed(() => {
  const all = sections.value
  if (all.length <= MAX_TABS) return all
  const first = all.slice(0, MAX_TABS)
  const chosen = active.value
  return chosen === undefined || first.includes(chosen)
    ? first
    : [...all.slice(0, MAX_TABS - 1), chosen]
})
const moreTabs = computed((): MenuItem[] =>
  sections.value
    .filter((section) => !visibleTabs.value.includes(section))
    .map((section) => ({
      key: section.id,
      label: title(section),
      run: () => {
        select(section)
      }
    }))
)

/** The panel's one ⋯: this panel's moves, then the side's, then Expand (F5). */
const panelMenu = computed((): MenuItem[] => [
  ...(area.value.arrangement === 'tabs' && active.value !== undefined
    ? menus.sectionMenu(active.value.id, active.value.view)
    : []),
  ...menuGroup(menus.areaMenu(props.side)),
  {
    key: 'expand',
    label: language.t(expanded.value ? 'right-panel-restore' : 'right-panel-expand'),
    separator: true,
    run: () => {
      expanded.value = !expanded.value
    }
  }
])

function commit(size: number): void {
  workbench.apply((layout) => resizeArea(layout, props.side, Math.max(DOCK_SIZE.min, size)))
  expanded.value = false
}

function select(section: Section): void {
  workbench.apply((layout) => selectSection(layout, section.id))
}

function toggle(section: Section): void {
  workbench.apply((layout) => setSectionCollapsed(layout, section.id, !section.collapsed))
}
</script>

<template>
  <aside
    v-if="active"
    :id="panelId"
    class="dock"
    :class="side"
    :aria-label="name"
    :style="{ inlineSize: `${width}px` }"
  >
    <Splitter
      :region="side"
      :size="width"
      :minimum="minimum"
      :maximum="maximum"
      :label="language.t('workbench-resize-panel', title(active))"
      :controls="panelId"
      @preview="preview = $event"
      @commit="commit"
      @expand="expanded = !expanded"
    />
    <div class="panel-header">
      <div
        v-if="area.arrangement === 'tabs'"
        class="tabs"
        role="tablist"
        :aria-label="name"
        @keydown="navigateTabs"
      >
        <button
          v-for="section in visibleTabs"
          :id="`workbench-tab-${section.id}`"
          :key="section.id"
          type="button"
          role="tab"
          :aria-selected="section.id === active.id"
          :aria-controls="`workbench-section-${section.id}`"
          :tabindex="section.id === active.id ? 0 : -1"
          :class="{ selected: section.id === active.id }"
          @click="select(section)"
        >
          {{ title(section) }}
        </button>
      </div>
      <span class="header-tools">
        <MenuButton
          v-if="area.arrangement === 'tabs' && moreTabs.length > 0"
          class="more-tabs"
          :label="language.t('workbench-more-panels')"
          :trigger="`${language.t('workbench-more-panels')} ▾`"
          :items="moreTabs"
        />
        <MenuButton
          :label="language.t('workbench-panel-options', title(active))"
          :items="panelMenu"
        />
      </span>
    </div>

    <div
      v-if="area.arrangement === 'tabs'"
      :id="`workbench-section-${active.id}`"
      class="section-body"
      :class="`view-${active.view}`"
      role="tabpanel"
      :aria-labelledby="`workbench-tab-${active.id}`"
    >
      <component :is="registeredView(active.view).component" />
    </div>
    <template v-else>
      <section
        v-for="section in sections"
        :key="section.id"
        class="stacked"
        :style="{ flexGrow: section.collapsed ? 0 : section.weight }"
      >
        <div class="section-header-row">
          <button
            type="button"
            class="section-header"
            :aria-expanded="!section.collapsed"
            :aria-controls="`workbench-section-${section.id}`"
            :aria-label="
              language.t(
                section.collapsed ? 'workbench-section-expand' : 'workbench-section-collapse',
                title(section)
              )
            "
            @click="toggle(section)"
          >
            <span
              class="disclosure"
              :class="{ mirrored: section.collapsed && direction === 'rtl' }"
              aria-hidden="true"
              >{{ section.collapsed ? '▸' : '▾' }}</span
            >
            {{ title(section) }}
          </button>
          <MenuButton
            :label="language.t('workbench-panel-options', title(section))"
            :items="menus.sectionMenu(section.id, section.view)"
          />
        </div>
        <div
          v-if="!section.collapsed"
          :id="`workbench-section-${section.id}`"
          class="section-body"
          :class="`view-${section.view}`"
        >
          <component :is="registeredView(section.view).component" />
        </div>
      </section>
    </template>
  </aside>
</template>

<style scoped>
.dock {
  position: relative;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  min-height: 0;
  background: var(--panel);
}

.dock.start {
  border-inline-end: 1px solid var(--line);
}

.dock.end {
  border-inline-start: 1px solid var(--line);
}

.panel-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.tabs {
  display: flex;
  flex: 1;
  flex-basis: 200px;
  min-width: 0;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-3) 0;
}

.tabs button {
  flex: 1;
  padding: var(--space-3) 0;
  border: none;
  border-bottom: 2px solid transparent;
  border-radius: 0;
  background: transparent;
  color: var(--text-muted);
  font-size: var(--text-small);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.tabs button.selected {
  border-bottom-color: var(--accent);
  color: var(--text-strong);
}

.header-tools {
  display: flex;
  gap: var(--space-1);
  align-items: center;
  margin: var(--space-3) 0 0;
  margin-inline: auto var(--space-3);
}

.more-tabs :deep(.options) {
  color: var(--text-muted);
  font-size: var(--text-caption);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.section-header-row {
  display: flex;
  align-items: center;
  padding-inline-end: var(--space-3);
}

.section-header-row .section-header {
  flex: 1;
}

.section-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

/* The reading panels scroll inside the dock, as they did on the right-hand side. */
.section-body.view-outline {
  display: block;
  overflow-y: auto;
  padding: var(--space-5) var(--space-5) var(--space-7);
}

.stacked {
  display: flex;
  flex-direction: column;
  flex-basis: 0;
  min-height: 0;
  border-top: 1px solid var(--line);
}

.stacked:first-of-type {
  border-top: none;
}

.section-header {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-3) var(--space-3);
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--text-muted);
  font-size: var(--text-small);
  letter-spacing: 0.06em;
  text-align: start;
  text-transform: uppercase;
}

.disclosure {
  display: inline-block;
}

/* Collapsed sections point toward inline-end, as binder parts do. */
.disclosure.mirrored {
  transform: scaleX(-1);
}
</style>
