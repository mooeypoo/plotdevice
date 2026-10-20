# 0011: Qualify Linux before distributing Windows installers

Date: 2026-10-20

## Decision

The maintainer cannot currently test on Windows and approved preparing
`0.1.0-beta.1` for Linux x64 only. Passing Windows CI is not evidence that the
installer, upgrades, sandbox, or data-safety flows work on a Windows desktop.
Do not distribute an unqualified Windows installer under an experimental label.

Keep Linux and Windows lint, typecheck, unit tests, and Electron/Vue compilation.
Tag pushes package only Linux. Manual CI runs may still build both platforms for
future qualification, but draft assembly downloads only the Linux artifact.
The exact release inventory is two installers, build metadata, and checksums.
Metadata explicitly declares `platforms: ["linux"]`; the producer verifies that
declaration and inventory instead of accepting whichever files happen to exist.

No releases have been published, so the initial metadata format can be tightened
without supporting a nonexistent legacy asset set. The notification feed remains
stable-only; publishing a beta must leave `stable: null`. Windows distribution
requires a later reviewed change to packaging, metadata validation, tests, and
public guidance, plus real installer qualification and a signing decision.

## Consequences

Linux qualification and beta rehearsal can proceed without access to Windows.
This is not approval to publish a stable MVP or claim broad Linux distro support.
The actual release assets must still be installed and exercised on a documented
Linux system before publication. No tag, release, or publication is authorized by
this record. The unimplemented manual update checker is disclosed as a beta gap.
