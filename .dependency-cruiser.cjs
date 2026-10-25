// Layer rules from docs/plans/phase-0-architecture-proposal.md §4.1. Paths are matched anywhere in the
// path, so the deliberate violations in tooling/arch-fixtures/ are judged by the same rules.
const pkg = (name) => `(^|/)packages/${name}/`
const desktop = (part) => `(^|/)apps/desktop/src/${part}/`
// An empty alternative instead of `(…)?`: dependency-cruiser rejects nested quantifiers as unsafe regexes.
const npm = (name) => `(^|/)node_modules/(\\.pnpm/[^/]+/node_modules/|)${name}/`
const notTests = '\\.test\\.ts$'

/** `from` may import only what `allowed` matches (tests may also import vitest). */
const onlyMayImport = (name, comment, from, allowed) => ({
  name,
  comment,
  severity: 'error',
  from: { path: from, pathNot: notTests },
  to: { pathNot: allowed },
})

module.exports = {
  forbidden: [
    { name: 'no-circular', severity: 'error', from: {}, to: { circular: true } },
    onlyMayImport('shared-is-a-leaf', 'shared is the kernel: no internal packages, no libraries', pkg('shared'), [pkg('shared')]),
    onlyMayImport('domain-is-pure', 'domain: only shared. No Node, Vue, Electron, parsers or other libraries', pkg('domain'), [
      pkg('domain'),
      pkg('shared'),
    ]),
    onlyMayImport('application-imports-inward', 'application: domain, shared and contract types only', pkg('application'), [
      pkg('application'),
      pkg('domain'),
      pkg('shared'),
      pkg('contracts'),
    ]),
    {
      name: 'application-uses-contract-types-only',
      comment: 'application may use contract types, never runtime code (zod schemas belong to the transport)',
      severity: 'error',
      from: { path: pkg('application') },
      to: { path: pkg('contracts'), dependencyTypesNot: ['type-only'] },
    },
    onlyMayImport('contracts-are-schemas', 'contracts: shared and zod only', pkg('contracts'), [
      pkg('contracts'),
      pkg('shared'),
      npm('zod'),
    ]),
    onlyMayImport(
      'markdown-is-pure',
      'markdown: text in, text out. Its own source-mapped model, not domain types (ADR 0003); no file access',
      pkg('markdown'),
      [pkg('markdown'), pkg('shared'), npm('yaml'), npm('micromark'), npm('mdast-util-from-markdown'), npm('@types/mdast')],
    ),
    onlyMayImport(
      'storage-reaches-files-through-ports',
      'storage: domain, markdown, shared, and application port types; files only via ports',
      pkg('storage'),
      [pkg('storage'), pkg('application'), pkg('domain'), pkg('markdown'), pkg('shared')],
    ),
    {
      name: 'storage-uses-port-types-only',
      severity: 'error',
      from: { path: pkg('storage') },
      to: { path: pkg('application'), dependencyTypesNot: ['type-only'] },
    },
    onlyMayImport('presentation-is-framework-free', 'presentation: shared and contracts; no Vue', pkg('presentation'), [
      pkg('presentation'),
      pkg('shared'),
      pkg('contracts'),
    ]),
    onlyMayImport('i18n-is-framework-free', 'i18n: shared and banana-i18n; no Vue', pkg('i18n'), [
      pkg('i18n'),
      pkg('shared'),
      npm('banana-i18n'),
    ]),
    {
      name: 'fs-node-implements-ports',
      comment: 'fs-node: Node built-ins, shared, and application port types',
      severity: 'error',
      from: { path: pkg('fs-node'), pathNot: notTests },
      to: { pathNot: [pkg('fs-node'), pkg('shared'), pkg('application')], dependencyTypesNot: ['core'] },
    },
    {
      name: 'fs-node-uses-port-types-only',
      severity: 'error',
      from: { path: pkg('fs-node') },
      to: { path: pkg('application'), dependencyTypesNot: ['type-only'] },
    },
    {
      name: 'ui-stays-in-the-renderer',
      comment: 'UI never reaches application, domain, file access, Node or Electron; it talks through contracts',
      severity: 'error',
      from: { path: [pkg('ui-vue'), desktop('renderer')] },
      to: { path: [pkg('application'), pkg('domain'), pkg('fs-node'), npm('electron'), '^electron$'] },
    },
    {
      name: 'no-node-outside-hosts-and-adapters',
      comment: 'Node built-ins only in fs-node and the Electron main process',
      severity: 'error',
      from: {
        path: [
          pkg('shared'),
          pkg('domain'),
          pkg('application'),
          pkg('contracts'),
          pkg('markdown'),
          pkg('storage'),
          pkg('presentation'),
          pkg('i18n'),
          pkg('ui-vue'),
          desktop('renderer'),
          desktop('preload'),
        ],
      },
      to: { dependencyTypes: ['core'] },
    },
    onlyMayImport('preload-is-narrow', 'preload: Electron and contract channel names only', desktop('preload'), [
      desktop('preload'),
      pkg('contracts'),
      npm('electron'),
      '^electron$',
    ]),
    {
      name: 'main-does-not-load-ui',
      severity: 'error',
      from: { path: desktop('main') },
      to: { path: [pkg('ui-vue'), desktop('renderer')] },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: ['(^|/)\\.tsbuild/', '(^|/)dist/', '(^|/)out/'] },
    tsPreCompilationDeps: true,
    combinedDependencies: true,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'types', 'default'],
      extensions: ['.ts', '.vue', '.js', '.json'],
    },
  },
}
