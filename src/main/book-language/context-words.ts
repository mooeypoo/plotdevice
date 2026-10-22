import type { BookWords } from './book-words'

/*
 * The book's words in the shape each context declares for itself (ADR 0019). This module knows no
 * context: TypeScript checks the shapes where the composition root hands them over.
 */

/** Words for new manuscript entries and the statuses offered when novel.md lists none. */
export function manuscriptWordsOf(book: BookWords) {
  return {
    untitledChapter: book.seeds['untitled-chapter'],
    untitledPart: book.seeds['untitled-part'],
    statuses: book.seeds.statuses
  }
}

/** Words for new codex entries. */
export function codexWordsOf(book: BookWords) {
  const { seeds } = book
  return {
    untitled: {
      character: seeds['unnamed-character'],
      location: seeds['unnamed-location'],
      note: seeds['untitled-note']
    },
    headings: {
      character: [seeds['heading-description'], seeds['heading-history'], seeds['heading-arc']],
      location: [seeds['heading-description'], seeds['heading-history']],
      note: []
    }
  }
}

/** Words for outlines: a new outline's title, and the Inbox heading captured beats go under. */
export function outlineWordsOf(book: BookWords) {
  return {
    untitledOutline: book.seeds['untitled-outline'],
    inbox: book.recognized.outline_inbox
  }
}

/** Words for a new novel.md: its `language`, statuses and comments. */
export function templateWordsOf(book: BookWords) {
  const { seeds } = book
  return {
    language: book.declared ?? book.language,
    statuses: seeds.statuses,
    comments: {
      defaults: seeds['comment-defaults'],
      language: seeds['comment-language'],
      calendar: seeds['comment-calendar'],
      threads: seeds['comment-threads'],
      threadName: seeds['comment-thread-name'],
      fileNames: seeds['comment-file-names'],
      orderPrefix: seeds['comment-order-prefix'],
      folders: seeds['comment-folders'],
      template: seeds['comment-template']
    }
  }
}
