import { existsSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { cruise, type ICruiseResult } from 'dependency-cruiser'
import { describe, expect, it } from 'vitest'

// The layer rules must hold on the real code AND catch every deliberate violation, so a rule that
// silently stopped matching anything cannot go unnoticed.
const require = createRequire(import.meta.url)
const config = require('../.dependency-cruiser.cjs') as { forbidden: { name: string }[]; options: Record<string, unknown> }
const root = join(import.meta.dirname, '..')
const fixtures = join(import.meta.dirname, 'arch-fixtures')

async function violatedRules(paths: string[]): Promise<{ rule: string; from: string; to: string }[]> {
  const { output } = await cruise(paths, { ...config.options, ruleSet: { forbidden: config.forbidden }, validate: true, baseDir: root })
  return (output as ICruiseResult).summary.violations.map((v) => ({ rule: v.rule.name, from: v.from, to: v.to }))
}

describe('architecture rules', () => {
  it('hold on the real code', async () => {
    const paths = ['packages', 'apps'].filter((dir) => existsSync(join(root, dir)))
    expect(await violatedRules(paths)).toEqual([])
  })

  const ruleNames = config.forbidden.map((rule) => rule.name)

  it('each have a deliberate-violation fixture', () => {
    expect(readdirSync(fixtures).sort()).toEqual([...ruleNames].sort())
  })

  it('read .vue files (a component importing the core is caught)', async () => {
    const found = await violatedRules(['tooling/arch-fixtures/ui-stays-in-the-renderer/packages/ui-vue/src/Bad.vue'])
    expect(found.map((v) => v.rule)).toContain('ui-stays-in-the-renderer')
  })

  it.each(ruleNames)('%s catches its fixture', async (rule) => {
    // Forward slashes on every OS: dependency-cruiser reports and matches POSIX-style paths.
    const found = await violatedRules([`tooling/arch-fixtures/${rule}`])
    expect(found.map((v) => v.rule)).toContain(rule)
  })
})
