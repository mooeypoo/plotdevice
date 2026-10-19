import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { cruise, type IConfiguration, type ICruiseResult } from 'dependency-cruiser'

const config = createRequire(import.meta.url)('../../.dependency-cruiser.cjs') as IConfiguration
const fixtureDir = fileURLToPath(new URL('./fixture', import.meta.url))

/** Files in the fixture named `violates-<rule>…` must break exactly that rule and nothing else. */
const expectedViolations = [
  // A cycle is reported once, from the module where it is first found.
  ['no-circular', 'src/main/violates-no-circular-a.ts'],
  ['not-to-unresolvable', 'src/main/violates-not-to-unresolvable.ts'],
  [
    'contexts-are-independent',
    'src/main/contexts/chronology/application/queries/violates-contexts-are-independent.ts'
  ],
  ['domain-is-pure', 'src/main/contexts/manuscript/domain/violates-domain-is-pure.ts'],
  [
    'domain-stays-in-domain',
    'src/main/contexts/manuscript/domain/violates-domain-stays-in-domain.ts'
  ],
  ['shared-kernel-is-pure', 'src/main/shared-kernel/violates-shared-kernel-is-pure.ts'],
  [
    'application-depends-inward',
    'src/main/contexts/manuscript/application/commands/violates-application-depends-inward.ts'
  ],
  [
    'adapters-only-in-composition-root',
    'src/main/contexts/manuscript/application/queries/violates-adapters-only-in-composition-root.ts'
  ],
  [
    'shared-infrastructure-knows-no-context',
    'src/main/infrastructure/violates-shared-infrastructure-knows-no-context.ts'
  ],
  ['ipc-uses-application-only', 'src/main/ipc/violates-ipc-uses-application-only.ts'],
  [
    'queries-use-context-queries-only',
    'src/main/queries/violates-queries-use-context-queries-only.ts'
  ],
  [
    'inner-layers-ignore-outer',
    'src/main/contexts/manuscript/infrastructure/violates-inner-layers-ignore-outer.ts'
  ],
  ['main-never-imports-renderer', 'src/main/violates-main-never-imports-renderer.ts'],
  ['preload-is-thin', 'src/preload/violates-preload-is-thin.ts'],
  ['contract-is-standalone', 'src/contract/violates-contract-is-standalone.ts'],
  ['renderer-sees-only-contract', 'src/renderer/src/violates-renderer-sees-only-contract.ts'],
  ['renderer-no-node', 'src/renderer/src/violates-renderer-no-node.ts'],
  ['renderer-no-electron', 'src/renderer/src/violates-renderer-no-electron.ts'],
  ['not-to-test', 'src/main/violates-not-to-test.ts']
].map(([rule, from]) => `${rule ?? ''}  ${from ?? ''}`)

async function cruiseFixture(): Promise<ICruiseResult> {
  const { output } = await cruise(
    ['src'],
    {
      ...config.options,
      baseDir: fixtureDir,
      validate: true,
      ruleSet: { forbidden: config.forbidden ?? [] }
    },
    config.options?.enhancedResolveOptions
  )
  if (typeof output === 'string') throw new Error('expected a cruise result object')
  return output
}

describe('dependency rules', () => {
  it('catch each violation in the fixture, and nothing else', async () => {
    const result = await cruiseFixture()
    const errors = result.summary.violations
      .filter((violation) => violation.rule.severity === 'error')
      .map((violation) => `${violation.rule.name}  ${violation.from}`)

    expect([...new Set(errors)].sort()).toEqual([...expectedViolations].sort())
  })

  it('have a fixture case for every error rule', () => {
    const errorRules = (config.forbidden ?? [])
      .filter((rule) => rule.severity === 'error')
      .map((rule) => rule.name)
    const covered = new Set(expectedViolations.map((entry) => entry.split('  ')[0]))
    // not-to-dev-dep depends on package.json dependency types, which the fixture tree can't express.
    const untestable = new Set(['not-to-dev-dep'])

    expect(
      errorRules.filter((name) => !covered.has(name ?? '') && !untestable.has(name ?? ''))
    ).toEqual([])
  })
})
