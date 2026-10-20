# Documentation verification

Checks the built VitePress HTML against the approved public page inventory.
Validates local page/fragment/asset references under the GitHub Pages project base.
No network calls, deployment, manuscript access, or generated-file edits.
Run `npm run docs:build`; update the explicit inventory when approving a new page.
The authoritative Markdown stays in `docs/`; internal plans must never be published.
`release-data.ts` provides offline preview, authenticated published discovery, and
pre-deployment freshness checks; never treat API errors as no stable release.
`verify-deployment.ts` checks anonymous public JSON/downloads with bounded retries.
Only approved deployment builds emit the version feed; local preview is not a registry.
