import type { Direction, DirectionMode } from '@plotdevice/domain'
import { Facet } from '@codemirror/state'

/** Words the editor shows or announces, in the interface language. */
export interface EditorLabels {
  chapterText: string
  sceneBreak: string
}

/** What the editor needs to know about the project and the author's settings. Changing them never recreates the editor. */
export interface EditorSettings {
  projectDirection: Direction
  directionMode: DirectionMode
  /** The project's language tag, for spellcheck and hyphenation. */
  language: string
  labels: EditorLabels
}

const DEFAULT_SETTINGS: EditorSettings = {
  projectDirection: 'ltr',
  directionMode: 'project',
  language: 'en',
  labels: { chapterText: 'Chapter text', sceneBreak: 'Scene break' },
}

export const editorSettings = Facet.define<EditorSettings, EditorSettings>({ combine: (values) => values[0] ?? DEFAULT_SETTINGS })
