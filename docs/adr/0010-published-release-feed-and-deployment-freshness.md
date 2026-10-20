# 0010: Derive version discovery from published releases

Date: 2026-10-20

## Decision

The site and installed-client feed share one validated release model. Discovery
uses authenticated GitHub APIs at build time; browsers and installed apps need no
token. Use GitHub's designated latest stable release, not the highest version or
newest timestamp. This permits a maintainer to withdraw a problematic latest version
without inventing a separate mutable version registry. Clients must never downgrade.

Require the exact R2 asset inventory, safe repository URLs, full commit identity,
GitHub SHA-256 asset digests, matching small release metadata, and consistent
checksums before advertising a stable version. A stable release without this
metadata fails the build; it is not silently skipped in favor of an older release.
No stable candidates after a successful release listing means `stable: null`;
API/access/validation failures never mean "no release".

Ordinary docs builds are explicitly offline previews and emit no public feed.
`docs:build:published` performs discovery and emits `updates/v1/latest.json`.
The version-1 contract has `schemaVersion`, `generatedAt`, and nullable `stable`;
stable has `version`, `tag`, `publishedAt`, and `releaseUrl`. Human download links
and the raw feed must agree. The file format and application versions are independent.

## Deployment

One workflow serializes Pages builds/deployments. A public repository plus an
explicit `PAGES_DEPLOYMENT_APPROVED=true` repository variable opens automatic
refresh for main pushes, release publication/withdrawal/edits/deletion, and daily reconciliation.
The variable starts unset; no site is deployed by this change. Manual runs default
to build-only and require an explicit deployment input from main to deploy.

Release-event runs check out current main, not the event's older tag. Before
deployment, re-discover release state and compare the build's saved source commit
against the deployment checkout and remote main. Stale work fails with a retry
instruction rather than regressing the feed. This reduces races but cannot make
GitHub Releases and Pages atomic; a release may change immediately after the check.
Subsequent events/scheduled reconciliation converge, and clients must tolerate stale
responses. An anonymous post-deploy check polls boundedly for the exact JSON and
verifies referenced download URLs.

Publication using `GITHUB_TOKEN` generally does not start release-event workflows.
Future automated publication must explicitly dispatch/reuse deployment; the daily
job is a recovery mechanism, not a reason to assume event chaining works.

## Consequences

Installed apps can use a small stable HTTPS contract without GitHub API rate limits
or repository credentials. We accept eventual consistency and a build-time dependency
on GitHub availability. Metadata/hash checks are not a substitute for installer QA,
code signing, or independent release provenance.
