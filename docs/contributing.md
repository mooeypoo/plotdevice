# Build something writers can trust

Plot Device is an Electron, Vue, and TypeScript application. The novel folder is
the source of truth; filesystem safety matters more than a convenient shortcut.

Start with [Development](development.md), then read the
[architecture](architecture.md) and the authoritative [file format](file-format.md).
Project instructions live in
[`AGENTS.md`](https://github.com/mooeypoo/plotdevice/blob/main/AGENTS.md).

## Contributions

Use a small disposable copy of the sample novel for manual testing. Never use the
repository's fixture files as your own test manuscript: their exact bytes are part
of the regression suite.

Discuss scope before adding a feature, dependency, or format change. Include tests
that demonstrate the behavior and preserve existing byte-exact round trips.

## Documentation

```bash
npm run docs:dev
npm run docs:build
npm run docs:preview
```

The production base is `/plotdevice/`. The build checks published-page inventory
and internal links, including fragments and static assets. Search, mobile layout,
keyboard navigation, and mixed-direction examples also need a production-preview check.

The site reuses the canonical file-format, architecture, development, and changelog
sources. Internal planning, ADRs, and maintainer release procedures are excluded
from the built site; they remain available in the source repository when public.

## License and source

Plot Device is licensed
[GPL-3.0-or-later](https://github.com/mooeypoo/plotdevice/blob/main/LICENSE).
The site's fonts are bundled under the SIL Open Font License; their original
notices are included on the [font licenses](font-licenses.md) page.
Public source access is planned at launch, alongside the installers.
