# chronology

**Purpose.** Story time and plotlines: reading and checking story dates under the project's calendar, and the threads defined in `novel.md`.

**Main concepts.** `StoryDate` (single dates and ranges, any year including negative ones), `Calendar` (`gregorian` or `day-count`), `Thread`. `TimelineEntry` arrives with the timeline (Phase 7).

**Use cases.** Queries: `GetChronologySettings`, `CheckStoryDate`. Port: `ChronologyRepository` (reads novel.md).

**Must not know about.** Chapter order, prose, or codex entries. The timeline grid that combines chapters with dates will be a read model in `src/main/queries/`.
