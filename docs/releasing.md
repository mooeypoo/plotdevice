# Releasing Plot Device

The [release plan](release-plan.md) is the policy, phase tracker, and cross-session
handoff. This runbook is the maintainer's checklist. **There is no automated release
publication yet.** Current CI builds installers on tags but does not create releases.

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
- [ ] **Stop until R2 is implemented and approved.** Do not push a version tag
  expecting the current CI to create a draft release.

## Build and qualify a draft (planned R2/R6)

- [ ] Create the annotated tag only after approval; push it deliberately.
- [ ] Require successful Linux and Windows CI and all expected architecture-specific
  installers before assembling a draft.
- [ ] Attach checksums and release metadata, then verify the actual attached bytes.
- [ ] Download and test those exact installers. Follow the refreshed
  [Windows test guide](testing-windows.md); test Linux installation and sandbox behavior too.
- [ ] Test upgrades/settings preservation, safe closure, outside edits, recovered
  copies, non-ASCII paths, uninstall, and untouched novel files using disposable copies.
- [ ] Record candidate tag/commit, workflow run, hashes, platform versions, test
  results, unresolved issues, and maintainer approval in the release handoff.
- [ ] Resolve signing disclosure, supported OS matrix, license/source availability,
  support route, and publication visibility before public release.

## Publish and verify (planned R4/R7)

- [ ] Explicit maintainer approval: make the repository public only at the agreed launch.
- [ ] Publish the complete draft with the correct prerelease/latest flags.
  Enable immutable releases only after reviewing repository settings.
- [ ] Verify downloads without authentication; install and confirm About's version.
- [ ] Deploy and verify the documentation, download page, and raw version JSON.
  Stable metadata must never advertise a draft or beta as latest stable.
- [ ] Record publication evidence and begin collecting the next `Unreleased` changes.

If a build/upload fails, retry the unpublished draft only after checking tag/commit
identity. Never replace published binaries or reuse a version. If Pages fails after
publication, keep downloads available and retry the site deployment; do not describe
a failed update check as "up to date". See the release plan for withdrawal/recovery.
