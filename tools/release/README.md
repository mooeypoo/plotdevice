# Release tools

`release.ts` provides read-only release guidance, preparation previews, local
pre-tag validation, and changelog extraction through the `release:*` npm scripts.
`draft.ts` is CI-only: it validates tag identity and assembles authenticated GitHub
draft releases with exact x64 assets, hashes, and build metadata; it never publishes.
Retries verify existing bytes without replacing assets or deleting a draft.
Neither tool certifies installer readiness or accesses a writer's novel.
Policy/progress: `docs/release-plan.md`. Maintainer instructions: `docs/releasing.md`.
`published-release.ts` validates the designated stable release, asset digests,
build metadata, checksum inventory, safe URLs, and the version-1 site/client feed.
