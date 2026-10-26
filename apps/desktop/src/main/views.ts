import type { OutlineEvent, OutlineState, ProjectSnapshot, SaveStatus, SessionEvent } from '@plotdevice/application'
import type { HostEvent, OutlineView, ProjectView, SaveStatusView } from '@plotdevice/contracts'
import { chapterNumbers, directionOfLanguage } from '@plotdevice/domain'
import type { ProjectPath } from '@plotdevice/shared'

/** The project as the page sees it: what to show, without revisions or other bookkeeping. */
export function projectView(snapshot: ProjectSnapshot): ProjectView {
  const { details } = snapshot
  const numbers = chapterNumbers(snapshot.contents, details.chapterNumbering)
  const ref = (chapter: { file: ProjectPath; linkText: string }) => ({
    file: chapter.file,
    linkText: chapter.linkText,
    number: numbers.get(chapter.file) ?? null,
  })
  return {
    root: snapshot.root,
    title: details.title,
    ...(details.author ? { author: details.author } : {}),
    language: details.language,
    direction: directionOfLanguage(details.language),
    chapterNumbering: details.chapterNumbering,
    contents: snapshot.contents.entries.map((entry) =>
      entry.kind === 'chapter' ? { kind: 'chapter', ...ref(entry) } : { kind: 'part', name: entry.name, chapters: entry.chapters.map(ref) },
    ),
    chapters: snapshot.chapters.map((chapter) => ({
      file: chapter.file,
      ...(chapter.title !== undefined ? { title: chapter.title } : {}),
      status: chapter.status,
      listed: chapter.listed,
    })),
    missing: [...snapshot.missing],
    outdatedLinkText: snapshot.outdatedLinkText.map(({ file, linkText, title }) => ({ file, linkText, title })),
    relinkSuggestions: snapshot.relinkSuggestions.map(({ missing, found, reason }) => ({ missing, found, reason })),
    duplicateIds: snapshot.duplicateIds.map(({ id, files }) => ({ id, files: [...files] })),
    warnings: snapshot.warnings.map(({ file, code, line }) => ({ file, code, ...(line !== undefined ? { line } : {}) })),
  }
}

export const saveStatusView = (status: SaveStatus): SaveStatusView => status.kind

export function hostEvent(event: SessionEvent): HostEvent {
  switch (event.kind) {
    case 'save-status':
      return { kind: 'save-status', file: event.file, status: saveStatusView(event.status) }
    case 'chapter-reloaded':
      return event
    case 'project-changed':
      return { kind: 'project-changed', project: projectView(event.project) }
  }
}

/** The page's view of an outline: what to show, without the revision. */
export function outlineView(state: OutlineState): OutlineView {
  return { file: state.file, ...state.outline, canUndo: state.canUndo, invalidDetails: state.invalidDetails }
}

export const outlineEvent = (event: OutlineEvent): HostEvent => ({ kind: 'outline-changed', outline: outlineView(event.document) })
