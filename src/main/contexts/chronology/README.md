# chronology

**Purpose.** Story time and plotlines: reading and checking story dates under the project's calendar, and the threads defined in `novel.md`.

**Main concepts.** `StoryDate` (single dates and ranges, any year including negative ones), `Calendar` (`gregorian` or `day-count`), `Thread`, `StorySpan` (a date or range as inclusive day numbers on one axis, with its precision; proleptic Gregorian days from 1970, or the day itself in a day-count project).

**Use cases.** Queries: `GetChronologySettings`, `CheckStoryDate`, `ReadStoryDates` (many values at once, with spans, for the timeline). Port: `ChronologyRepository` (reads novel.md).

**Presentation boundary.** Readings retain date/range precision; invalid values carry semantic `StoryDateIssue` reasons and parameters, never localized sentences. The renderer formats them at display time.

**Must not know about.** Chapter order, prose, or codex entries. The timeline that combines chapters with dates is the read model `src/main/queries/get-timeline.ts`.
