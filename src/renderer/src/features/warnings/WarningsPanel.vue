<script setup lang="ts">
import type { ChosenFixDto } from '../../../../contract/dtos'
import type { WarningGroup } from './warning-groups'

defineProps<{
  groups: readonly WarningGroup[]
  /** Whether a path can be opened in the editor (only parts and chapters can). */
  canOpen: (path: string) => boolean
  readOnly: boolean
}>()

defineEmits<{ open: [path: string]; fix: [path: string, fix: ChosenFixDto] }>()

/** "locations/Marrow.md" → "locations/Marrow", as a link would name it. */
const linkName = (path: string): string => path.replace(/\.md$/iu, '')
</script>

<template>
  <section class="warnings" aria-labelledby="warnings-heading">
    <h2 id="warnings-heading" class="eyebrow">Needs attention</h2>
    <p class="intro">
      Plot Device never changes files because of these. Fix them in the app or in any editor; this
      list updates as you do.
    </p>
    <section v-for="group in groups" :key="group.heading" class="group">
      <h3>
        {{ group.heading }} <span class="count">{{ group.items.length }}</span>
      </h3>
      <ul>
        <li v-for="item in group.items" :key="item.key">
          <button
            v-if="item.path !== undefined && canOpen(item.path)"
            type="button"
            class="path"
            dir="auto"
            :title="`Open ${item.path}`"
            @click="$emit('open', item.path)"
          >
            {{ item.path }}
          </button>
          <code v-else-if="item.path !== undefined" class="path" dir="auto">{{ item.path }}</code>
          <span class="message" dir="auto">{{ item.message }}</span>
          <div v-if="item.path !== undefined && item.fix !== undefined && !readOnly" class="fixes">
            <template v-if="item.fix.kind === 'path-form'">
              <button
                v-for="choice in item.fix.choices"
                :key="choice"
                type="button"
                class="fix"
                dir="auto"
                @click="$emit('fix', item.path, { kind: 'path-form', name: item.fix.name, choice })"
              >
                Means {{ linkName(choice) }}
              </button>
            </template>
            <button
              v-else
              type="button"
              class="fix"
              @click="$emit('fix', item.path, { kind: 'quote', key: item.fix.key })"
            >
              Add quotes
            </button>
          </div>
        </li>
      </ul>
    </section>
  </section>
</template>

<style scoped>
.warnings {
  margin-top: 36px;
}

.intro {
  margin: 8px 0 0;
  color: var(--text-muted);
  line-height: 1.5;
}

.group {
  margin-top: 22px;
}

h3 {
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}

.count {
  margin-inline-start: 6px;
  font-weight: 400;
  color: var(--text-muted);
}

ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

li {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 0;
  border-bottom: 1px solid var(--line);
}

.path {
  align-self: flex-start;
  padding: 0;
  border: none;
  background: transparent;
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--text);
  text-align: start;
}

button.path {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.fixes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.fix {
  padding: 3px 10px;
  font-size: 12px;
}

.message {
  color: var(--text-dim);
  line-height: 1.45;
}
</style>
