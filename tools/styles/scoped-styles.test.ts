import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { compileStyle, parse } from 'vue/compiler-sfc'

const root = fileURLToPath(new URL('../../', import.meta.url))
const SCOPE = 'data-v-scopecheck'

function vueFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return vueFiles(path)
    return entry.name.endsWith('.vue') ? [path] : []
  })
}

/** Compiled selectors of a scoped style block that no longer carry the component's scope. */
function unscopedSelectors(source: string, filename: string): string[] {
  const leaks: string[] = []
  for (const style of parse(source, { filename }).descriptor.styles) {
    if (!style.scoped) continue
    const result = compileStyle({ source: style.content, filename, id: SCOPE, scoped: true })
    result.rawResult?.root.walkRules((rule) => {
      const parent = rule.parent
      const inKeyframes =
        parent?.type === 'atrule' && 'name' in parent && /keyframes$/u.test(parent.name)
      if (!inKeyframes && !rule.selector.includes(SCOPE)) leaks.push(rule.selector)
    })
  }
  return leaks
}

describe('scoped component styles', () => {
  // Vue silently drops everything after `:global(...)`, so `:global([dir='rtl']) .icon` became
  // `[dir='rtl']` and mirrored the whole RTL interface. Every scoped rule must stay scoped.
  it('never leak a rule onto the whole page', () => {
    const leaks = vueFiles(join(root, 'src/renderer/src')).flatMap((file) =>
      unscopedSelectors(readFileSync(file, 'utf8'), file).map(
        (selector) => `${relative(root, file)}: ${selector}`
      )
    )
    expect(leaks).toEqual([])
  })

  it('catches the :global pattern that mirrored the RTL interface', () => {
    const source = `<template><i /></template>
<style scoped>
:global([dir='rtl']) .icon { transform: scaleX(-1); }
.fine { color: red; }
</style>`
    expect(unscopedSelectors(source, 'Example.vue')).toEqual(["[dir='rtl']"])
  })
})
