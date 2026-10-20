# 0009: VitePress manual with an explicit publication boundary

Date: 2026-10-20

## Decision

Use VitePress for an English-first static manual, reusing canonical Markdown under
`docs/`, the root changelog, the app's icon, and locally bundled OFL fonts.
Use local search and no analytics or remotely hosted fonts.

Pin `vitepress` to `2.0.0-alpha.20`, with maintainer approval. Stable 1.6.4 brought
Vite 5/esbuild development-server advisories, including a high-severity Windows
file-access advisory. The approved alpha uses Vite 8, matching the app's toolchain,
without an unsupported transitive override. It is a pre-release dependency:
upgrade deliberately, review the release notes and audit delta, and rerun the
production build, publication checks, search, and browser checks before changing it.
Do not assume a newer alpha is drop-in compatible.

## Publication boundary

The production base is `/plotdevice/`. Internal plans, the roadmap, maintainer
release instructions, Windows qualification guide, and ADRs are excluded from
generated pages and local search, not merely hidden from navigation.
A post-build check requires an explicit approved HTML inventory and valid local links.

PR CI builds the site without deploying. The Pages workflow is manual, defaults to
build-only, and permits deployment only from `main` after the repository is public.
Only its deployment job gets Pages/OIDC write permissions. Enabling Pages, changing
visibility, and running a public deployment remain explicit maintainer operations.
No automatic publication trigger is introduced while launch approval is pending.

## Consequences

The existing file-format contract remains authoritative, with no second maintained
copy. Guides can be read as Markdown; the site adds navigation, search, and presentation.
Release notes show `Unreleased` honestly until candidate preparation happens.
R4 must generate both download data and the version feed from published releases,
and add deliberate deployment/reconciliation triggers without regressing this boundary.
No version JSON or installed-app update checker is claimed by the documentation phase.
