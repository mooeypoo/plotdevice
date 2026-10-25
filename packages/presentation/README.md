# presentation

View models and display rules for the UI, free of any UI framework, so they can be tested without a
browser and reused by a future web or mobile front end:

- **Appearance:** which theme to show.
- **The navigator:** moving chapters up, down and "to…" in reading order.
- **Outlines:** Board columns, List rows and Cards in order; keyboard moves; card text as safe spans.
- **References:** search (ranked, ignoring case, accents and niqqud), link targets, writing a link.

- Imports `shared` and `contracts` types; never Vue, Electron or the application core.
