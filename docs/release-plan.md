# Release and documentation program

Status: **Preparation approved; implementation proceeds one phase at a time. No publication authorized.**
Researched: 2026-10-20. Owner: project maintainer.

This is the shared planning and handoff document for release engineering, public
documentation, and update discovery. Read `AGENTS.md`, the [file contract](file-format.md),
[architecture](architecture.md), and [roadmap](roadmap.md) first. Those contracts
remain authoritative. Work on one approved phase at a time.

## 1. Goals and boundaries

- Ship identifiable, tested Linux and Windows installers through GitHub Releases.
- Give writers a clear download page, a useful manual, release notes, and upgrade help.
- Let an installed app discover a newer published release without requiring a GitHub account.
- Preserve offline writing, the novel folder, settings identity, and user control.
- Make preparation, publication, verification, and recovery repeatable.
- Divide implementation into small changes with explicit owners and prerequisites.

Not initial scope: macOS, ARM builds, a package repository, mandatory accounts,
telemetry, automatic installation, a custom update server, or a redesigned app.
No new dependency, public deployment, repository visibility change, release, or tag
is approved by this document.

### Resume here

The maintainer approved committing this plan and starting local preparation on
2026-10-20, including guided release helper scripts. R1 is implemented; the maintainer
subsequently approved starting R2, the tag-triggered draft-release pipeline.
Do not interpret that approval as permission to publish, push tags, change repository
visibility, add dependencies, or start all remaining phases at once.

Completed: beta candidate package metadata (`0.1.0-beta.1`), an initial changelog,
the [release runbook](releasing.md), and read-only `release:guide`,
`release:prepare`, `release:check`, and `release:notes` helpers with tests.
Notes intentionally remain `Unreleased`: no candidate date, tag, or publication
has been fabricated. Local release checks should fail until a dated candidate
section is prepared. The planning checkpoint is commit `ce10f91`; find the R1
implementation checkpoint in git history by its release-preparation commit title.

R2 implements annotated-tag/package/changelog/main-branch validation, explicit x64
builds, and draft assembly after both platform builds. Drafts contain three
installers, checksums, and deterministic build metadata. Existing assets are
downloaded and compared before missing uploads; published or mismatched drafts
are refused. Only the assembly job gets release write permission. Release actions
are pinned to resolved SHAs. Shared version/notes validation is reused without the
local-only clean-tree/unused-tag checks. No dependency was added.

Next handoff: R2 still needs its first real tagged Actions rehearsal and installer
qualification. No remote draft/tag/run was created during implementation; notes
remain `Unreleased`. The maintainer approved R3, including VitePress, then explicitly
approved pinning `2.0.0-alpha.20` after stable 1.6.4 introduced older Vite toolchain
advisories. The alpha reuses Vite 8; its pre-release upgrade risk is recorded in
ADR 0009. Signing, domain, and supported-OS policy remain open before their release
gates. Do not publish or enable Pages merely because a workflow file exists.

R3 adds an editorial writer-facing manual, local search, existing canonical references,
and changelog inclusion. Internal planning/ADRs are excluded; a tested post-build
checker asserts the exact 16-page inventory and local page/fragment/asset references
under `/plotdevice/`. CI builds it on Linux. The Pages workflow defaults to build-only
and deploys only with explicit manual input, on `main`, when the repository is public.
No deployment is performed. Local preview needs no push. A normal branch push is
needed for hosted CI; a version-tag push is needed only for the later approved
candidate rehearsal. Neither has been performed.

The maintainer approved continuing with R4 on 2026-10-20. It now derives home/download
and update-page data from GitHub's designated latest complete stable release, verified
against R2 asset digests, build metadata, and checksums. The raw version-1 JSON
contract is emitted only for authenticated-discovery builds. Ordinary docs commands
are explicitly offline previews and emit no public feed. No dependency was added.

R4 extends the single Pages deployment owner with release/main/schedule triggers,
but automatic runs require a public repository AND the initially unset
`PAGES_DEPLOYMENT_APPROVED=true` variable. Manual runs remain build-only by default.
Source/metadata freshness checks reject stale builds before deployment; anonymous
post-deploy checks retry boundedly for CDN propagation. See ADR 0010 and the runbook.
No repository variable, visibility, Pages setting, release, or workflow run was changed.

R4 local validation (2026-10-20): lint/dependency rules, typecheck, all 124 test files /
1038 tests, Electron/Vue production build, offline docs build, and link/feed checks
passed. New discovery/freshness/deployment/site tests cover designated-latest
selection, beta/draft exclusion, explicit no-stable state, API failures, invalid
URLs/digests/inventory/metadata/checksums, stale commits/releases, preview-feed
exclusion, rendered links, anonymous reachability, and wrong CDN responses.
The authenticated real build succeeded with this repository's empty release
inventory and emitted `stable: null`. A synthetic complete stable state also passed
the actual VitePress render and all five download-link/feed checks; offline rebuild
restored preview state and removed the feed. No synthetic data was committed.
The real freshness command correctly rejected unpushed local-vs-remote main.
There is still no real published stable release, so the first public release's
metadata/download checks remain an explicit rehearsal gate. Existing Node module
classification/future Vite native-loader warnings remain visible; current builds
pass without broad package-type changes or warning suppression.
Find the checkpoint in git history as "feat: derive site downloads and version feed from published releases".

Next handoff after R4: R5, the manual installed-app update notification, needs its
own scoped plan and approval, including an explicitly approved maintained SemVer
dependency and the fixed feed origin. Keep Pages deployment disabled until launch.
A normal push is now needed for hosted CI/discovery verification, but not local
implementation. Local freshness correctly rejects unpushed commits that differ
from remote main; do not bypass this guard to claim hosted qualification.

R3 local validation (2026-10-20): lint/dependency rules, typecheck, 121 test files /
995 tests, Electron/Vue production build, production docs build, and publication/link
checks passed. Five new tests cover page inventory, escaped/relative URLs, fragments,
missing assets, accidental planning-page publication, and gated workflow wiring.
An isolated Chrome production-preview check verified desktop light/mobile dark,
no horizontal overflow, loaded images and local fonts, keyboard skip link, local
search results and Escape dismissal, excluded planning-page results, mobile menu,
Hebrew RTL rendering, and the 404 page's project-base home link. Integrated browser
interaction tools timed out, so the fallback used Chrome's local debugging protocol.
No hosted CI/Pages deployment was performed. `npm audit --omit=dev` found zero
advisories; the full install retains eight moderate existing electron-builder
toolchain advisories, with no newly introduced VitePress/Vite advisory.
Find the checkpoint in git history as "feat: add writer documentation and gated Pages workflow".

R1 validation (2026-10-20): lint and dependency rules passed; typecheck passed;
119 test files / 969 tests passed, including 26 release-helper tests; Electron/Vue
production build passed; `git diff --check` passed. The CLI preview was exercised
at the current beta version and checks correctly rejected undated candidate notes.
Tests run helpers against temporary git repositories and verify no file/tag/commit
mutation, successful clean pre-tag checks, and rejection of reused local tags.

R2 local validation (2026-10-20): lint/dependency rules, typecheck, all 120 test
files / 990 tests, Electron/Vue production build, and `git diff --check` passed.
The 21 new draft-pipeline tests cover exact installer inventory, actual checksum
contents, successful/partial retries, changed bytes/run identity/notes/commit/channel,
published-release refusal, discovery errors, and workflow wiring. CLI tests run
against temporary git repositories for annotated/lightweight tags, off-main commits,
event/commit mismatch, and manual-run rejection. No hosted Actions run, real
installer build, GitHub draft creation, or publication was performed for R2.
Find this checkpoint in git history as "feat: assemble verified draft releases on version tags".

## 2. Original verified starting point (before R1/R2)

- `package.json` and the root package entries in `package-lock.json` use `0.1.0`.
  About uses Electron's `app.getVersion()` rather than a separate version literal.
- CI already checks Linux and Windows, including Vue template compilation.
  Version tags and manual runs build AppImage, deb, and Windows NSIS installers.
  Outputs currently stop at Actions artifacts.
- Packaging deliberately disables publishing. Keep builds separate from publication.
- GitHub reports the repository as **private**, with no releases and no Pages site.
  Neither the local checkout nor `git ls-remote --tags origin` has tags as of
  2026-10-20.
- The roadmap still requires a real Windows installation test.
- The existing Windows test guide describes an older conflict-resolution UI.
  Refresh it against the current recovery behavior before treating it as release evidence.
- There is no root changelog or documented release procedure.
- The on-disk format is independently versioned as `format: 1`.
  IPC contract versions and file-content revision tokens are also not app versions.

## 3. Decisions to settle

### Recorded maintainer choices (2026-10-20)

- Keep this repository private during preparation; deliberately make it public at
  launch. A separate public distribution repository is not the selected direction.
- Rehearse with `0.1.0-beta.1`, then qualify and release `0.1.0` as the MVP.
  R1 should synchronize the first candidate version in package metadata and the
  lockfile; the current unreleased `0.1.0` value is not a historical release.
- Plan VitePress with English-first documentation and RTL-ready examples.
  This selects the framework for the plan, not permission to install it yet.
- Include manual Help -> Check for Updates in the MVP, opening a browser release
  page only. No automatic background checks, downloads, installation, or restart.

The remaining recommendations below are still open, especially the exact site
domain, Windows signing posture, supported OS matrix, and final publication gates.
Preparing private beta drafts is possible before launch, but anonymous public
site/feed/download verification must wait until the chosen publication boundary is
actually public. Rehearse the public-facing build locally beforehand.

| Decision | Recommended starting point | Alternative / consequence |
| --- | --- | --- |
| Public distribution boundary | Make this repository public deliberately at launch, after a publication review | Keep development private and create a separate public distribution/docs repository; this adds source-distribution, credentials, and synchronization work |
| First public version | Rehearse with `0.1.0-beta.1`, then ship `0.1.0` as the MVP once gates pass | Launch beta-only initially, or choose `1.0.0` only if making a deliberate stable-product commitment |
| Docs framework | VitePress: fits Vue/Vite and keeps existing Markdown useful | Astro Starlight: strong docs defaults, search, and RTL, but introduces Astro and a different content setup |
| Publication control | Tag builds a complete draft; maintainer tests and publishes it | Fully automatic publication later, when smoke-test evidence is sufficient |
| Update UX | Explicit Help -> Check for Updates first; no background request by default | Add opt-in, rate-limited background checks after agreeing on privacy and interruption behavior |
| Installation | Open the trusted release/download page in the browser | Automatic download/install is a later, separately designed feature |
| Site location | Project Pages URL initially | Choose a maintainer-controlled custom domain before shipping the feed URL for greater long-term portability |
| Documentation languages | English first; design navigation and examples to accommodate Hebrew/RTL | Ship translated docs now, which requires maintained translations and locale QA |
| Windows signing | Investigate cost/provider now; explicitly disclose unsigned MVP if accepted | Make signing a release blocker if the desired audience should not face unsigned-app friction |

Private GitHub Releases do not become public downloads by linking to them from Pages.
Never embed a GitHub access token in the app or website. Pages availability from a
private source repository depends on the account plan, and a public Pages deployment
can expose selected built content even when the repository stays private.

### Trade-offs, not assumed consensus

**Delivery versus confidence:** automatic publication is simpler for a maintainer,
but a draft gate catches installer and upgrade failures that unit tests cannot.
Start with the gate; remove it only deliberately.

**Framework familiarity versus documentation defaults:** VitePress minimizes new
concepts and migration. Starlight has an attractive out-of-box documentation and RTL
story. Prefer VitePress unless a small presentation prototype exposes a concrete gap.
Neither requires a hosted search service.

**Convenience versus local-first expectations:** background checks help users learn
about fixes, but they introduce network activity into an offline writing app.
An explicit manual check is the least surprising initial behavior.

**One repository versus private development:** publishing this repository makes
downloads, source correspondence, and automation simpler. A separate public
distribution repository preserves private development, but needs an explicit
GPL-compatible corresponding-source distribution process and scoped cross-repository
automation credentials. Visibility is a maintainer decision, not an implementation detail.

## 4. Version and changelog policy

- `package.json` is the authoritative app version; update lockfile root package
  metadata with npm tooling. Never replace matching dependency versions globally.
- Tag names are exactly `v<app-version>`. Reject malformed tags, version mismatches,
  missing changelog sections, and reused published versions.
- Use SemVer ordering, not string comparison. Prereleases sort below their matching
  final version; build metadata does not change precedence.
- Proposed initial policy: `0.1.0` first MVP, `0.1.x` compatible fixes, `0.2.0` new
  features or a clearly explained breaking change. Even during `0.x`, announce
  compatibility changes explicitly rather than relying on SemVer's flexibility.
- Keep app version, file-format version, IPC contract version, feed schema version,
  and filesystem content revisions distinct. Releasing the app does not change
  `format: 1` or introduce automatic novel migrations.
- Create `CHANGELOG.md` using Keep a Changelog: `Unreleased`, dated version sections,
  and relevant Added / Changed / Deprecated / Removed / Fixed / Security headings.
- Curate the first entry from verified shipped functionality. Do not invent release
  history or publication dates. Move entries out of `Unreleased` during preparation.
- Generate release notes from the matching changelog section. PR/contributor lists
  can supplement it; raw commit logs should not replace writer-facing notes.
- A beta executable embeds its beta version. Do not rename beta installers as final:
  a final version gets its own tagged build and validation.
- Published versions and tags are never reused, moved, or silently rebuilt in place.

## 5. Release lifecycle

```text
Approved release preparation PR
  -> version + lockfile + changelog + relevant docs
  -> merge, verify exact commit, push annotated version tag
  -> validate version/changelog/source policy
  -> Linux + Windows checks and native packaging
  -> collect exact expected assets, hashes, and release metadata
  -> create/update an unpublished draft for that tag
  -> maintainer smoke-tests the actual attached installers
  -> publish complete release, immutable when enabled
  -> regenerate Pages/download information from published releases
  -> verify anonymous downloads and version feed
```

### Controls

- Reuse existing CI rather than duplicate its platform checks. Ordinary manual builds
  remain non-publishing; release-specific recovery commands are explicit.
- Assert the intended architecture rather than relying on runner defaults. Initially
  target x64 only if approved, with an accurately tested OS support table.
- Use native Linux and Windows runners and `npm ci`; retain build-only publishing
  suppression. Pin release actions to reviewed commit SHAs and plan their updates.
- Scope `contents: write` to the release job. Pages deployment uses its own
  `pages: write`, `id-token: write`, and deployment environment. PR jobs get no
  publication permissions or signing credentials.
- Validate user-controlled version inputs and pass them as data, not shell source.
  Confirm a release tag points to the intended reviewed commit on the release branch.
- Protect version tags and default-branch changes where the account supports it.
  Enable immutable releases after confirming repository support/settings.
- Build all platform assets before creating/publishing a complete release. Attach
  SHA-256 checksums and a small release metadata file recording version, commit,
  build run, architecture, supported file format, and asset inventory.
- Hash the final signed bytes if signing is enabled. Checksums detect corruption;
  they do not independently prove publisher identity. Signing, GitHub release
  attestations, and optional build provenance serve different purposes.
- Reruns may resume an unpublished draft after checking tag/commit identity. They
  must not mix assets from unrelated runs or overwrite published binaries. Verify
  the complete attached inventory and digests before allowing publication.
- Do not cancel a publication midway because a new run starts. Define concurrency
  separately for branch checks, per-tag draft assembly, and Pages deployment.
- Stable and prerelease flags must agree with the version. Explicitly manage the
  intended latest stable release so a maintenance release does not displace it.

### Failure and recovery

- Failed checks/builds: no publication and no new feed entry.
- Failed draft upload: retain actionable logs; retry assembly without making a
  partial release public.
- Failed Pages deployment after publication: installers remain available on GitHub,
  the feed may temporarily lag, and maintainers receive a visible failure and a
  documented retry path. Do not claim cross-service atomicity.
- Bad published release: document withdrawal/known issue, point latest stable to a
  reviewed safe release if appropriate, and publish a corrected new version.
  No automatic application downgrade or novel rollback.
- A scheduled reconciliation/manual refresh repairs missed site updates and release
  metadata edits. It must never advertise drafts, prereleases as stable, or missing assets.

## 6. Documentation site

### Proposed presentation

A writer-facing home page, not a developer README with a theme:

- Lead with "Write the novel. Keep the files.", the pen-nib identity, a real app
  screenshot, and clear Download / Start writing actions.
- Show the latest published stable version, platform choices, and release notes.
  Do not advertise the version on the development branch as available.
- Use a restrained, readable visual style related to the app, without forcing its
  dark editor aesthetic onto long-form reading. Include light/dark support,
  responsive navigation, accessible focus/contrast, and screenshot descriptions.
- Keep task-oriented sidebars and local search. No analytics, externally hosted
  fonts, cookie banner dependency, or account requirement by default.
- Preserve mixed Hebrew/Latin examples, test keyboard navigation and mobile layout,
  and avoid equating RTL prose support with a fully translated interface.

### Information architecture

| Area | Initial content |
| --- | --- |
| Home | What it does, screenshots, platforms, ownership/local-first promise |
| Download | Per-platform installers, exact version, unsigned Windows notice, Ubuntu sandbox guidance, checksums |
| Start writing | Install, create/open a project, write a first chapter, organize parts |
| Writer's guide | Editor, inspector, outline, codex, links, overview, timeline, interactions |
| Keeping work safe | Autosave, outside edits, explicit recovery, backups, Obsidian/git coexistence |
| Updates and releases | Manual upgrade steps, release notes, compatibility and support policy |
| Troubleshooting | Installation, sandbox, common warnings, safe issue reporting |
| Reference | Canonical file format, templates, settings, keyboard shortcuts |
| Contributing | Development, architecture, testing, release procedure, source/license information |

### Repository integration

- Proposed VitePress root: existing `docs/`, with `.vitepress/config.ts` and a small
  theme override. Existing authoritative reference Markdown stays in place.
- Add public user guides under `docs/guide/` and a download page. Link or render the
  root changelog through a controlled build step; do not maintain a second copy.
- Explicitly exclude internal release planning, draft material, and non-public ADRs
  from the published page set and search. Hiding a sidebar entry is not exclusion.
- Test existing Markdown examples containing Vue-like interpolation or angle
  brackets. Add presentation escaping only where necessary without weakening the
  on-disk contract. Preserve usable repository-relative Markdown links.
- Configure `/plotdevice/` as the base for the project Pages URL, with correct
  images, nested-page links, search, JSON URLs, and a useful 404 page.
- Build docs in PRs; deploy only trusted sources. Link checking and a production
  preview smoke test are part of acceptance.
- Start with one current stable manual, clear development-only labels where needed,
  and per-release notes. Do not copy the whole manual per patch version. Add archived
  major/minor manuals only when real compatibility differences justify them.
- Docs-only deployments must preserve/regenerate the published feed, never overwrite
  it with a branch version. Serialize Pages deployments; re-resolve published release
  state when preparing a deployment so an older queued run cannot regress the feed.
- Hosting installers stays on Releases, not Pages. The site and JSON remain small.

## 7. Version feed and update discovery

Provide a human page such as `/updates/` and a separate machine endpoint such as
`/updates/v1/latest.json`. An app must not scrape HTML, badges, or the changelog.

Illustrative stable-feed shape, subject to agreement:

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-10-20T12:00:00Z",
  "stable": {
    "version": "0.1.0",
    "tag": "v0.1.0",
    "publishedAt": "2026-10-20T11:00:00Z",
    "releaseUrl": "https://github.com/mooeypoo/plotdevice/releases/tag/v0.1.0"
  }
}
```

The version, date, and URL above are examples, not an existing release.
If a successful authenticated discovery confirms there is no published stable
release, represent that explicitly with `stable: null`. API authorization, network,
rate-limit, or parsing failures are not "no release"; fail deployment visibly instead.
URLs change if a separate distribution repository is selected.

### Producer contract

- Published GitHub Releases are the distribution authority. The feed is derived;
  never hand-edit it, infer availability from `package.json`, or announce a draft.
- Resolve the intentionally designated latest stable release and verify SemVer,
  tag/metadata agreement, and expected downloadable assets. Do not choose simply by
  publication timestamp or assume the API always selects the highest SemVer.
- Prereleases remain opt-in and do not replace stable. A separate preview channel
  can be added later without changing version-1 stable semantics.
- Generate the human download page and feed from the same verified release model.
  Put immutable per-release metadata with the release assets where useful.
- Version the feed path/schema and keep old client contracts working. Do not
  include executable code, HTML UI, arbitrary commands, or mandatory-update policy.
- Prefer one Pages deployment owner with release-publication and docs-change triggers,
  plus explicit manual recovery and scheduled reconciliation.
- A release created/published using `GITHUB_TOKEN` does not generally trigger another
  workflow. Human publication can trigger `release: published`; fully automated
  publication must explicitly invoke the shared deployment job/workflow or dispatch
  it. Do not add a broad PAT just to make event chaining appear to work.
- Verify the deployed JSON anonymously, including HTTPS, schema, referenced release,
  and downloads. Allow bounded propagation time. Pages/CDN freshness is eventual;
  confirm actual response headers and do not promise custom cache-control support.
- Avoid a service worker caching the feed. Revalidation and low check frequency are
  sufficient initially; no cache-busting polling loop.

### Consumer contract

- First implementation: Help -> Check for Updates, showing installed/latest versions
  and a user-initiated Open release page action. No automatic install or restart.
- Network I/O belongs in main-process infrastructure; comparison is pure and typed.
  Wire any renderer status through `src/contract/`, the preload, and fake API.
  Keep this app-level concern out of the novel's domain contexts and file format.
- Read the running version from Electron. Validate the response with zod, enforce
  HTTPS and approved release-host/repository paths, and handle redirects deliberately.
  Pass no arbitrary server-supplied URL directly to `shell.openExternal`.
- Bound request time, response size, and retries. Deduplicate checks. Do not block
  startup, autosave, navigation, or recovery on network access.
- Distinguish update available, current, running a newer/development build, no stable
  release, offline/unreachable, and invalid/unsupported metadata. Failed checks must
  not display "You're up to date". Keep any cached success labeled with its timestamp.
- Only offer a strictly newer eligible version. Never suggest a downgrade because
  a stale feed or rollback points at an older version.
- Prefer an approved maintained SemVer implementation over inventing a partial parser.
  This is an explicit dependency decision; do not import a transitive dependency
  without declaring it.
- No novel text, file paths, project names, user identifiers, or credentials leave the
  app. Document that GitHub receives ordinary request/network metadata.
- Any later automatic checks need an explicit setting/default, maximum frequency,
  dismissed-version behavior, and persistence in `userData`, never the novel folder.

### Why static JSON rather than direct GitHub API calls?

A tiny static contract isolates installed apps from GitHub API fields and avoids
sharing the unauthenticated REST API quota (60 requests/hour per originating IP).
It also works for the download page without client-side API dependencies.
The trade-off is an additional deployment/freshness step, so reconciliation and
failure visibility are required. Pages is not unlimited or guaranteed real-time.

### Why not automatic installation now?

A notification and browser download work consistently across NSIS, AppImage, and deb.
Electron's built-in `autoUpdater` does not support Linux and is not a drop-in updater
for this app's NSIS packaging. If automatic installation is desired later, evaluate
`electron-updater` and current target support, signed payload verification, its own
metadata/blockmap formats, Linux installation permissions/package-manager ownership,
and safe coordination with unsaved drafts. The JSON feed proposed here is not
`electron-updater` metadata and must not pretend to be.

## 8. Release contents and readiness

Required before the first public stable release:

- Three expected x64 installers if that architecture policy is approved; no unpacked
  debug directories, secrets, or accidental development-only assets.
- Version/tag/commit identity, curated notes, known issues, file-format compatibility,
  tested OS/architecture matrix, and checksums.
- Exact corresponding source and build/install instructions for GPL distribution,
  plus dependency/font license notices. GitHub's generated source archives are useful,
  but do not assume they alone satisfy every corresponding-source obligation.
- Honest unsigned Windows guidance if accepted. Signing establishes publisher
  identity but does not guarantee SmartScreen warnings disappear immediately.
  Never instruct users to disable antivirus or app sandboxing.
- Linux installation guidance, especially Ubuntu's deb/AppImage sandbox differences.
  A downloaded deb is not an apt repository and will not update itself through apt.
- Manual upgrade and uninstall instructions: close safely, install the new version,
  preserve `userData`, never modify/remove the novel, recommend ordinary backups.
- Clear limitations: no persistent crash-recovery promise, no guaranteed novel
  rollback, no promise that syncing/git replaces backups.
- A support/bug-report path with safe diagnostics and a private vulnerability
  disclosure route; ask users not to upload real manuscripts or credentials.
- Review current dependency/Electron support and known advisories; record any
  accepted build-tool-only risk rather than silently treating all findings alike.

Recommended follow-ups: automate a small packaged-app smoke test, add artifact
provenance/SBOM where tooling supports it, dependency update maintenance, signing,
release cadence/support window, and a custom domain if not chosen initially.
Do not claim bit-for-bit reproducible installers without measuring it.

## 9. Proposed phases and agent handoffs

Each row is a separately approved phase/PR, not a requirement to make one giant
commit. Files below are anticipated touch points, not permission for broad edits.
Avoid parallel edits to shared manifests, CI, roadmap, or this plan.

| Phase | Owner / prerequisites | Deliverables and likely files | Acceptance |
| --- | --- | --- | --- |
| R0: Agree policy | Maintainer; no prerequisites | Resolve section 3; approve source/publication boundary, MVP label, signing posture, update UX, framework, and domain; update this plan and roadmap | Explicit decisions recorded; no implicit public deployment |
| R1: Version and preparation | Release agent; R0 | `CHANGELOG.md`, `package.json`, lockfile, release runbook, small preparation/validation tools and tests under `tools/release/`; npm scripts | Dry-run gives exact edits/checks; versions/changelog agree; no automatic commit/tag/push; invalid inputs fail without partial edits |
| R2: Draft release pipeline | Release agent; R1 | Existing `.github/workflows/ci.yml`, release helper/tests, packaging config only if needed, runbook | Rehearsal produces complete draft for exact tag; both OS checks pass; digests verified; reruns and failure cases tested; manual builds never publish |
| R3: Public manual and site | Docs agent; R0 | VitePress config/theme, `docs/index.md`, `docs/guide/`, download page, existing canonical references, manifest scripts, Pages workflow, package/lockfile | Approved framework dependency; production-base build, search, links, mobile/keyboard/RTL checks; excluded planning content absent from output |
| R4: Published metadata | Release/docs integration owner; R2 and R3 | Feed generator/tests, shared release model, deployment triggers/concurrency, download-page data, runbook | Only published complete releases appear; prerelease/draft/rerun/stale-deployment cases pass; anonymous site/feed/assets verified |
| R5: In-app update notification | App agent; R4 and approved UI/dependency decisions | Main-process update service/adapter and tests, Help menu, optional typed contract/preload/composable/fake API, architecture/main README updates | Manual/offline/error/newer/current/prerelease/unsafe-URL cases pass; no startup request, download, restart, or novel writes |
| R6: Release qualification | QA owner; R2-R4; R5 if included in MVP | Refresh Windows guide; Linux/Windows install/upgrade/uninstall and recovery evidence; privacy/license/support docs; final changelog | Test actual candidate assets, preserve novel/settings, verify bytes and version; maintainer signs off publication |
| R7: Publish and verify | Maintainer; R6 | Publish draft, verify immutable state if enabled, deploy site/feed, record result and next `Unreleased` work | Public anonymous download works; installed About matches tag; feed advertises only the published release; recovery steps exercised |

R3 content drafting and R1 tooling can proceed in parallel after R0, using separate
branches/worktrees with clear ownership. Sequence shared dependency-manifest edits
through one integrator. The selected MVP includes R5; deferring it would be a
maintainer-approved scope change. Do not claim an in-app update checker exists
merely because the endpoint exists.

### Agent protocol

1. Read this plan and the authoritative project instructions; check the current
   worktree and existing work before editing.
2. Claim one approved phase, list exact expected files, identify dependencies, and
   obtain approval as required by `AGENTS.md`.
3. Use a separate branch/worktree. Do not create agents, branches, issues, or PRs
   automatically merely because this plan names roles.
4. Keep external settings/actions explicit: Pages enablement, visibility, domain DNS,
   tag protections, signing credentials, and release publication belong to the maintainer.
5. Update the handoff table below with PR/commit, tests, unresolved risks, and next
   action. Do not report a phase complete based only on code existing.
6. The integration owner updates shared roadmap/progress; do not let multiple agents
   independently rewrite policy or maintain conflicting copies of the plan.

| Phase | Status | Owner / branch / PR | Evidence and next action |
| --- | --- | --- | --- |
| R0 | Local preparation approved | Maintainer | Four initial choices recorded; signing/domain/OS/publication gates remain open |
| R1 | Implemented and verified | Copilot, current checkout | Beta metadata, changelog, read-only helpers and runbook; full validation gate passed; no remote writes |
| R2 | Implemented locally; remote rehearsal pending | Copilot, current checkout | CI draft assembler and retry/identity tests; no tag push, draft, or publication performed |
| R3 | Implemented and locally verified; deployment pending launch | Copilot, current checkout | Approved pinned VitePress 2 alpha; 16-page manual, search, publication/link checks and browser QA; no push/deployment |
| R4 | Implemented and verified locally; hosted checks pending | Copilot, current checkout | Derived stable feed and human downloads; freshness and gated refresh workflow; no public deployment |
| R5 | Planned for MVP, not started | Unassigned | Depends on R4 and UX/dependency approval |
| R6 | Not started | Unassigned | Candidate installer evidence required |
| R7 | Not started | Maintainer | Publication is an explicit human action |

## 10. Validation matrix

- Release tooling: valid/invalid SemVer, lockfile/tag/changelog mismatch, missing
  assets, duplicate/reused tags, partial upload, draft retry, published overwrite refusal.
- Feed generator: no stable release, draft-only/beta-only inventory, multiple release
  lines, explicit latest designation, missing assets, API errors, schema failure,
  old deployment queued after new publication, and reconciliation.
- Update client: numeric ordering (`0.9.0 < 0.10.0`), prerelease identifiers, build
  metadata, newer local version, timeouts/offline, oversized/malformed responses,
  unsupported schema, untrusted links/redirects, concurrency, and no unexpected network I/O.
- Site: build and links under the real base path; search/download/404 behavior;
  deployed raw JSON shape; no planning content, source secrets, or unintended files;
  mobile, keyboard, contrast, mixed-direction text, and screenshots.
- Installer QA: fresh install, previous-version upgrade, settings preserved,
  safe app closure, outside-edit recovery, non-ASCII paths, Linux sandbox, uninstall
  leaves novels untouched. Use a temp copy of fixtures, never the fixtures themselves.
- Run targeted tests during implementation, then the project's required completion
  gate: `npm run lint && npm run typecheck && npm run test && npx electron-vite build`.
  Add docs production build checks once docs tooling exists. Documentation-only
  planning changes do not require app builds.

## 11. Research and source notes

Official sources were checked on 2026-10-20. Some documentation URLs were unavailable;
implementation must verify exact installed tool versions and current supported
options rather than copying framework examples or action versions blindly.

- [GitHub immutable releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases):
  published assets/tags are protected; draft -> attach all assets -> publish is the
  recommended order, and release attestations are generated for immutable releases.
- [GitHub workflow triggering](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow):
  token-created events generally do not start another workflow; explicit dispatch
  and reusable/same-workflow orchestration avoid hidden event-chain failures.
- [GitHub Releases API](https://docs.github.com/en/rest/releases/releases):
  latest-release and `make_latest` behavior must be handled deliberately.
- [GitHub REST rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api):
  unauthenticated quota is per originating IP, not per installed app.
- [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages),
  [visibility](https://docs.github.com/en/pages/getting-started-with-github-pages/changing-the-visibility-of-your-github-pages-site),
  and [limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits):
  static hosting, publication boundaries, access restrictions, request logging,
  and hosting limits matter to the site/feed design.
- [VitePress deployment guide source](https://github.com/vuejs/vitepress/blob/main/docs/en/guide/deploy.md),
  [local search](https://github.com/vuejs/vitepress/blob/main/docs/en/reference/default-theme-search.md),
  [i18n](https://github.com/vuejs/vitepress/blob/main/docs/en/guide/i18n.md),
  and [public assets](https://github.com/vuejs/vitepress/blob/main/docs/en/guide/asset-handling.md):
  project base paths, Pages deployment, local search, locale direction, and unmodified
  static JSON are supported. Main-branch documentation may describe unreleased features;
  choose a stable compatible release and verify against it.
- [Starlight setup](https://starlight.astro.build/getting-started/),
  [search](https://starlight.astro.build/guides/site-search/), and
  [i18n](https://starlight.astro.build/guides/i18n/): the main alternative, with
  default Pagefind search and documented full RTL support.
- [Electron autoUpdater](https://www.electronjs.org/docs/latest/api/auto-updater),
  [code signing](https://www.electronjs.org/docs/latest/tutorial/code-signing), and
  [security](https://www.electronjs.org/docs/latest/tutorial/security):
  native updater limitations, signing, and treating remote data as untrusted.
  The electron-builder updater documentation could not be retrieved during this
  research; automatic-update target support is intentionally not specified here.
- [SemVer 2.0.0](https://semver.org/spec/v2.0.0.html) and
  [Keep a Changelog](https://keepachangelog.com/en/1.1.0/): version precedence,
  initial-development versions, immutable version contents, and human-readable notes.
