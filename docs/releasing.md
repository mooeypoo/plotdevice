# Releasing Plot Device

The [release plan](release-plan.md) is the policy, phase tracker, and cross-session
handoff. This runbook is the maintainer's checklist. **Publication remains manual.**
On pushed annotated version tags, CI validates and builds installers, then assembles
an unpublished draft. This pipeline still needs its first real tagged Actions rehearsal.

## Resume work

1. Read `AGENTS.md`, the release plan's "Resume here" section, and its handoff table.
2. Check `git status` and recent commits; do not overwrite another session's work.
3. Continue only the approved phase. Record completed work, validation, unresolved
   blockers, and the next action in the plan before stopping.

## Guided helpers

Run these from the repository root using the project's supported Node version:

```bash
npm run release:guide
npm run release:prepare -- 0.1.0-beta.1
npm run release:check
npm run release:notes
```

All four commands are read-only. They never commit, tag, push, publish, change files,
or call GitHub. Failures exit nonzero with an explanation.

- `release:guide`: print the sequence and reminders.
- `release:prepare -- <version>`: preview the package-version command, changelog
  heading, and expected tag/channel. It is safe to run repeatedly.
- `release:check -- [v<version>]`: require matching package/lockfile versions, exactly
  one dated nonempty changelog section, an unused local tag, and a clean worktree.
  This is a **pre-tag** check, not a CI check of an already tagged checkout.
- `release:notes -- [version]`: print only that version's dated changelog section,
  suitable for future release-note automation or manual inspection.

The CLI uses Node's built-in TypeScript stripping, not a new runtime dependency.
Node 22 may print an experimental-feature warning. Tests and project typechecking
validate the TypeScript; the CLI does not typecheck itself at runtime.

Release versions support `MAJOR.MINOR.PATCH` and prerelease identifiers, such as
`0.1.0-beta.1`. No `v` prefix in package versions, leading numeric zeroes, or build
metadata are accepted by these helpers. Tags use the `v` prefix.
The first beta's notes intentionally remain in `Unreleased` until a candidate is
actually prepared: `release:check` and `release:notes` should fail until then.

## Prepare a candidate

- [ ] Confirm scope, version, intended release date, known issues, and support matrix.
  Start with `0.1.0-beta.1`; do not release `0.1.0` until MVP qualification is complete.
- [ ] Preview with `npm run release:prepare -- <version>`.
- [ ] Run the printed `npm version <version> --no-git-tag-version --ignore-scripts`
  command if a version update is needed. Review package and lockfile changes.
- [ ] Curate the root [changelog](../CHANGELOG.md). Move only included changes from
  `Unreleased` to `## [<version>] - YYYY-MM-DD`; keep an `Unreleased` section for
  subsequent work. Use the intended release date, not an invented historical date.
- [ ] Update installation/upgrade guidance and known issues for this candidate.
- [ ] Run the full completion gate:

```bash
npm run lint && npm run typecheck && npm run test && npx electron-vite build
```

- [ ] Review and commit preparation, then run `npm run release:check`.
- [ ] Inspect `npm run release:notes`; the beta and final version need distinct notes.
- [ ] Check remote state manually: `git ls-remote --tags origin` and
  `gh release list --repo mooeypoo/plotdevice`. Local helpers do not know about remote-only
  tags/releases and cannot certify a version has never been published.
- [ ] Verify the exact reviewed commit and release-branch policy.
- [ ] Obtain explicit approval to push the candidate tag. Adding the pipeline does
  not authorize a release run; do not tag an undated `Unreleased` candidate.

## Build and qualify a draft (pipeline implemented; remote rehearsal pending)

- [ ] Make sure the pipeline and prepared candidate commit are pushed/merged first.
  Confirm that the release commit belongs to `main`.
- [ ] Create the annotated tag only after approval; push it deliberately. For example,
  after reviewing the exact commit and version:

```bash
git tag -a v0.1.0-beta.1 <reviewed-commit-sha> -m "Plot Device 0.1.0-beta.1"
git push origin v0.1.0-beta.1
```

- [ ] Follow **Actions -> CI**. It requires the tag, package/lockfile versions,
  dated changelog, checkout/event commit, and membership in `origin/main` to agree.
  Lightweight tags and manual workflow runs cannot create release drafts.
- [ ] Require successful Linux and Windows CI and all expected architecture-specific
  installers before assembling a draft. CI currently builds **x64** explicitly;
  this is not a promise that every OS version has been tested.
- [ ] Wait for **Assemble unpublished release** to finish. It attaches:
  - `plotdevice-<version>.AppImage`
  - `plotdevice_<version>_amd64.deb`
  - `plotdevice-<version>-setup.exe`
  - `release-metadata.json` (version, commit, architecture, format, build run, installer hashes)
  - `SHA256SUMS` (installers and metadata)
- [ ] Verify downloaded bytes: on Linux, put all five assets in one folder and run
  `sha256sum --check SHA256SUMS`. On Windows use PowerShell
  `Get-FileHash <installer-path> -Algorithm SHA256` and compare to the matching line.
  The assembler also downloads and hashes every attached asset before declaring success.
- [ ] Download and test those exact installers. Follow the refreshed
  [Windows test guide](testing-windows.md); it still needs updating for current
  recovery wording before qualification. Test Linux installation and sandbox behavior too.
- [ ] Test upgrades/settings preservation, safe closure, outside edits, recovered
  copies, non-ASCII paths, uninstall, and untouched novel files using disposable copies.
- [ ] Record candidate tag/commit, workflow run, hashes, platform versions, test
  results, unresolved issues, and maintainer approval in the release handoff.
- [ ] Resolve signing disclosure, supported OS matrix, license/source availability,
  support route, and publication visibility before public release.

### Retry rules

- Keep the release a **draft until the entire assembly job succeeds and QA signs off**.
  Do not publish or hand-edit draft assets/notes while assembly is running.
- For a transient failure, use **Re-run failed jobs** on the same workflow run.
  Downloads are scoped to that run. Already uploaded assets are downloaded and
  verified; only missing assets are uploaded. There is no `--clobber`.
- A full rebuild can produce different bytes even at the same commit. The tool
  refuses mismatched existing bytes rather than silently mixing installers.
- A new workflow run has a different run identity. If an old draft exists for that
  tag, the tool refuses to mix its metadata with the new run.
- If resuming is impossible, first confirm with the maintainer that the release is
  still unpublished and nothing was distributed. The maintainer can explicitly
  delete the incomplete draft, retain the unchanged tag/commit, and rerun the build.
  Automation never deletes drafts, tags, or assets. If the version was published or
  distributed, use a new version instead.
- A published release is never changed by this tool, even if its assets are incomplete.
  Publication or latest-stable designation must be handled deliberately by the maintainer.
- Manual **Run workflow** remains installer-only; it is useful for testing but does
  not create a draft. It cannot substitute for the first tagged release rehearsal.

The CI-only entry point is `tools/release/draft.ts validate | assemble <directory>`.
Unlike the four local helpers, `assemble` performs authenticated GitHub writes.
It requires a pushed-tag Actions context, repository identity, a reviewed `main`
commit, and a token scoped to release contents. Do not invoke it as a local shortcut.

## Publish and verify (R4 tooling ready; qualification/publication pending R7)

- [ ] Explicit maintainer approval: make the repository public only at the agreed launch.
- [ ] Publish the complete draft with the correct prerelease/latest flags.
  Enable immutable releases only after reviewing repository settings.
- [ ] Verify downloads without authentication; install and confirm About's version.
- [ ] Deploy and verify the documentation, download page, and raw version JSON.
  Stable metadata must never advertise a draft or beta as latest stable.
- [ ] Record publication evidence and begin collecting the next `Unreleased` changes.

### Site and version-feed refresh (R4 tooling implemented)

Local documentation commands remain offline. For authenticated discovery without
deployment, run `npm run docs:build:published`; inspect the generated
`docs/.vitepress/dist/updates/v1/latest.json` and download page. An empty verified
stable-release inventory produces `stable: null`, not the current package version.
Beta releases do not become stable merely because no final release exists.

After a normal push, **Actions -> Documentation -> Run workflow**, leaving `deploy`
unchecked, exercises hosted build-only discovery. A push is needed before GitHub can
run new workflow code. This does not require a version tag or public repository.

Only after launch approval:

1. Confirm source visibility, Pages configuration (GitHub Actions), and the
   `github-pages` environment. Keep any required reviewers enabled.
2. Run Documentation from `main` with `deploy` checked for the first deliberate
   deployment. Private repositories remain blocked by the workflow gate.
3. Check the job's anonymous verification result and open the page/feed yourself.
4. If automatic refresh is approved, set repository variable
   `PAGES_DEPLOYMENT_APPROVED` to `true`. Until then it must remain unset/false.
5. Subsequent main pushes, release publication/withdrawal/edits/deletion, and a daily scheduled
   reconciliation can refresh the site. The schedule is a recovery path, not instant
   availability. All deploys are serialized and rebuild from current `main`.

The selected stable release is GitHub's designated latest stable release. Explicitly
manage that designation for maintenance releases and withdrawals; the generator does
not pick the highest SemVer or newest publication date. It refuses incomplete/mismatched
metadata rather than silently promoting an older release. Publish a stable release
with all assets before pointing download/update consumers to it.

If freshness checks fail, rerun the workflow against current state. Do not bypass
them or edit generated JSON. If public verification fails after deployment, read
the logged attempts, inspect Pages/API availability, and rerun after fixing the
cause. A failure must remain visible even if the site eventually catches up.

Human publication can trigger the release workflow event. If publication later uses
`GITHUB_TOKEN`, explicitly invoke/dispatch Documentation (with an explicit approved
deployment input or reusable workflow); do not assume that token chains events.
No PAT is needed for the current human-publish workflow.

If a build/upload fails, retry the unpublished draft only after checking tag/commit
identity. Never replace published binaries or reuse a version. If Pages fails after
publication, keep downloads available and retry the site deployment; do not describe
a failed update check as "up to date". See the release plan for withdrawal/recovery.
