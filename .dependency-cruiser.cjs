// Layer and context boundaries from docs/architecture.md. Each kind of violation triggers exactly
// one rule; tools/dependency-rules/rules.test.ts proves every rule against a small fixture tree.

const TEST_FILE = '\\.test\\.ts$'
const ELECTRON = '(^|/)node_modules/electron/'

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'i18n-is-presentation-only',
      comment: 'Shared localization imports only catalogs, contract types and its runtime library.',
      severity: 'error',
      from: { path: '^src/i18n/', pathNot: TEST_FILE },
      to: { pathNot: ['^src/(i18n|contract)/', '(^|/)node_modules/banana-i18n/'] }
    },
    {
      name: 'no-circular',
      comment: 'Import cycles make the layering meaningless.',
      severity: 'error',
      from: {},
      to: { circular: true }
    },
    {
      name: 'not-to-unresolvable',
      comment: 'Every import must resolve to a real module.',
      severity: 'error',
      from: {},
      to: { couldNotResolve: true, pathNot: '\\?asset$' }
    },
    {
      name: 'contexts-are-independent',
      comment: 'Contexts never import each other. Cross-context reads belong in src/main/queries/.',
      severity: 'error',
      from: { path: '^src/main/contexts/([^/]+)/' },
      to: { path: '^src/main/contexts/', pathNot: '^src/main/contexts/$1/' }
    },
    {
      name: 'domain-is-pure',
      comment:
        'Domain code imports only its own domain and the shared kernel: no Node, Electron, or libraries.',
      severity: 'error',
      from: { path: '^src/main/contexts/[^/]+/domain/', pathNot: TEST_FILE },
      to: { pathNot: '^src/main/(contexts|shared-kernel)/' }
    },
    {
      name: 'domain-stays-in-domain',
      comment: 'The domain does not know about the use cases built on it.',
      severity: 'error',
      from: { path: '^src/main/contexts/([^/]+)/domain/' },
      to: { path: '^src/main/contexts/$1/application/' }
    },
    {
      name: 'shared-kernel-is-pure',
      comment: 'The shared kernel imports nothing outside itself.',
      severity: 'error',
      from: { path: '^src/main/shared-kernel/', pathNot: TEST_FILE },
      to: { pathNot: '^src/main/shared-kernel/' }
    },
    {
      name: 'application-depends-inward',
      comment:
        'Use cases depend on their domain and ports, never on Node, Electron, libraries, or main-process wiring.',
      severity: 'error',
      from: { path: '^src/main/contexts/[^/]+/application/', pathNot: TEST_FILE },
      to: { pathNot: '^src/main/(contexts|shared-kernel)/' }
    },
    {
      name: 'adapters-only-in-composition-root',
      comment: 'Only composition-root.ts (and infrastructure itself) may import concrete adapters.',
      severity: 'error',
      from: {
        pathNot: [
          '^src/main/composition-root\\.ts$',
          '^src/main/infrastructure/',
          '^src/main/contexts/[^/]+/infrastructure/'
        ]
      },
      to: { path: ['^src/main/infrastructure/', '^src/main/contexts/[^/]+/infrastructure/'] }
    },
    {
      name: 'shared-infrastructure-knows-no-context',
      comment: 'Cross-context technical adapters must not depend on any context.',
      severity: 'error',
      from: { path: '^src/main/infrastructure/' },
      to: { path: '^src/main/contexts/' }
    },
    {
      name: 'ipc-uses-application-only',
      comment:
        'IPC handlers call use cases; they never reach into a domain. Tests may use the in-memory fakes next to the ports.',
      severity: 'error',
      from: { path: '^src/main/ipc/', pathNot: TEST_FILE },
      to: { path: '^src/main/contexts/[^/]+/domain/' }
    },
    {
      name: 'queries-use-context-queries-only',
      comment:
        'Cross-context read models only read: they use application/queries/, never commands or domain.',
      severity: 'error',
      from: { path: '^src/main/queries/', pathNot: TEST_FILE },
      to: { path: '^src/main/contexts/[^/]+/(domain|application/commands)/' }
    },
    {
      name: 'inner-layers-ignore-outer',
      comment: 'Contexts and shared infrastructure never import IPC, queries, or app wiring.',
      severity: 'error',
      from: { path: '^src/main/(contexts|infrastructure)/' },
      to: { path: ['^src/main/(ipc|queries)/', '^src/main/(composition-root|index)\\.ts$'] }
    },
    {
      name: 'main-never-imports-renderer',
      comment: 'The main process does not depend on UI code.',
      severity: 'error',
      from: { path: '^src/main/' },
      to: { path: '^src/renderer/' }
    },
    {
      name: 'preload-is-thin',
      comment: 'The preload only bridges the contract to Electron IPC.',
      severity: 'error',
      from: { path: '^src/preload/' },
      to: { pathNot: ['^src/(preload|contract)/', ELECTRON] }
    },
    {
      name: 'contract-is-standalone',
      comment: 'The contract is plain types shared by main and renderer; it imports nothing.',
      severity: 'error',
      from: { path: '^src/contract/' },
      to: { pathNot: '^src/contract/' }
    },
    {
      name: 'renderer-sees-only-contract',
      comment: 'The renderer talks to the main process only through src/contract/.',
      severity: 'error',
      from: { path: '^src/renderer/' },
      to: { path: '^src/(main|preload)/' }
    },
    {
      name: 'renderer-no-node',
      comment: 'The renderer never touches Node or the filesystem.',
      severity: 'error',
      from: { path: '^src/renderer/' },
      to: { dependencyTypes: ['core'] }
    },
    {
      name: 'renderer-no-electron',
      comment: 'The renderer reaches Electron only through window.plotDevice.',
      severity: 'error',
      from: { path: '^src/renderer/' },
      to: { path: ELECTRON }
    },
    {
      name: 'workbench-model-is-pure',
      comment:
        'The layout model is plain TypeScript: no Vue, Pinia, stores, features or storage (ADR 0017).',
      severity: 'error',
      from: { path: '^src/renderer/src/workbench/model/', pathNot: TEST_FILE },
      to: { pathNot: ['^src/renderer/src/workbench/model/', '(^|/)node_modules/zod/'] }
    },
    {
      name: 'not-to-test',
      comment: 'Production code never imports tests.',
      severity: 'error',
      from: { pathNot: TEST_FILE },
      to: { path: TEST_FILE }
    },
    {
      name: 'not-to-dev-dep',
      comment:
        'Main and preload code ship unbundled dependencies, so they must be in "dependencies". Electron is provided at runtime.',
      severity: 'error',
      from: { path: '^src/(main|preload)/', pathNot: TEST_FILE },
      to: { dependencyTypes: ['npm-dev'], dependencyTypesNot: ['type-only'], pathNot: ELECTRON }
    },
    {
      name: 'no-orphans',
      comment: 'A module nothing imports is usually dead code.',
      severity: 'warn',
      from: {
        orphan: true,
        pathNot: [TEST_FILE, '\\.d\\.ts$', '(^|/)\\.gitkeep$', '^src/(main|preload)/index\\.ts$']
      },
      to: {}
    }
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    skipAnalysisNotInRules: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['module', 'main', 'types', 'typings'],
      extensions: ['.ts', '.vue', '.d.ts', '.js', '.mjs', '.cjs', '.json']
    }
  }
}
