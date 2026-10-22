import { acceptCompletion, autocompletion } from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { Compartment, EditorState, Prec, StateEffect, type Extension } from '@codemirror/state'
import { EditorView, keymap, placeholder } from '@codemirror/view'
import type { LinkTargetDto } from '../../../../contract/dtos'
import type { WritingDirection } from '../../app/writing-preferences-store'
import type { ProseEditorCopy } from './prose-editor-copy'
import { focusDimming } from './focus-dimming'
import { autoLineDirection, technicalSpanDirection } from './line-direction'
import { proseAppearance } from './prose-theme'
import { wikiLinkDecorations } from './wiki-link-decorations'
import { linkAt, type LinkAt } from '../../shared/link-at'
import type { ScreenRect } from '../../shared/screen-rect'
import { linkCompletionSource, type LinkCompletionTarget } from './link-completion'
import { createLinkKindLookup } from '../../shared/wiki-link-scan'

/** A book's declared writing direction, or `null` when it declares no language. */
export type BookDirection = 'ltr' | 'rtl' | null

/** What the editor needs when it is created. */
export interface ProseEditorOptions {
  readonly text: string
  readonly writingDirection: WritingDirection
  /** The declared book language's direction; Auto uses it as the base. `null` keeps `auto`. */
  readonly bookDirection: BookDirection
  readonly copy: ProseEditorCopy
  /** Session state is reused only when its text still matches the freshly read file. */
  readonly state?: EditorState | undefined
  readonly readOnly: boolean
  readonly focusMode: boolean
  readonly linkTargets: readonly LinkTargetDto[]
  readonly onChange: (text: string) => void
  readonly onBlur: () => void
  /** What `[[` offers; read each time, so it follows the project as files change. */
  readonly completions: () => readonly LinkCompletionTarget[]
  /** Ctrl/Cmd+click on a link. */
  readonly onOpenLink: (link: LinkAt) => void
  /** Ctrl/Cmd+hover over a link, or Alt+Enter with the caret in one. */
  readonly onPeek?: (link: LinkAt, near: ScreenRect, byKeyboard: boolean) => void
  /** The pointer left the peeked link, or Ctrl/Cmd was released. */
  readonly onPeekEnd?: () => void
}

/** A mounted prose editor and the settings that can change while it is open. */
export interface ProseEditor {
  setReadOnly(on: boolean): void
  setWritingDirection(direction: WritingDirection, bookDirection: BookDirection): void
  setCopy(copy: ProseEditorCopy): void
  remeasure(): void
  setFocusMode(on: boolean): void
  setLinkTargets(targets: readonly LinkTargetDto[]): void
  focus(): void
  snapshot(): EditorState
  destroy(): void
}

/** Mounts a wrapped prose editor with an independently configurable text-direction mode. */
export function createProseEditor(parent: HTMLElement, options: ProseEditorOptions): ProseEditor {
  const focusCompartment = new Compartment()
  const linksCompartment = new Compartment()
  const editingCompartment = new Compartment()
  const directionCompartment = new Compartment()
  const copyCompartment = new Compartment()
  let linkTargets = options.linkTargets
  let copy = options.copy
  const linkExtensions = () =>
    wikiLinkDecorations(createLinkKindLookup(linkTargets), (target, embed) =>
      copy.linkTooltip(target, embed)
    )

  /** The link last peeked by pointer, so moving within it doesn't peek again. */
  let peeked: string | undefined

  function linkNear(
    view: EditorView,
    position: number
  ): { link: LinkAt; near: ScreenRect } | undefined {
    const line = view.state.doc.lineAt(position)
    const link = linkAt(line.text, line.from, position)
    if (link === undefined) return undefined
    // A position that isn't laid out has no coordinates; the editor's own box still anchors the peek.
    const { left, right, top, bottom } =
      view.coordsAtPos(position) ?? view.contentDOM.getBoundingClientRect()
    return { link, near: { left, right, top, bottom } }
  }

  function endPeek(): void {
    if (peeked === undefined) return
    peeked = undefined
    options.onPeekEnd?.()
  }

  const extensions = [
    history(),
    keymap.of([
      {
        // Not Mod-Shift-Enter: that is Return to writing, handled at window level as well.
        key: 'Alt-Enter',
        run: (view) => {
          const found = linkNear(view, view.state.selection.main.head)
          if (found === undefined || options.onPeek === undefined) return false
          options.onPeek(found.link, found.near, true)
          return true
        }
      },
      ...defaultKeymap,
      ...historyKeymap
    ]),
    markdown({ base: markdownLanguage }),
    proseAppearance(),
    EditorView.lineWrapping,
    technicalSpanDirection(),
    directionCompartment.of(
      writingDirectionExtensions(options.writingDirection, options.bookDirection)
    ),
    copyCompartment.of(copyExtensions(copy)),
    editingCompartment.of([
      EditorState.readOnly.of(options.readOnly),
      EditorView.editable.of(!options.readOnly)
    ]),
    focusCompartment.of(options.focusMode ? focusDimming() : []),
    linksCompartment.of(linkExtensions()),
    autocompletion({
      override: [linkCompletionSource(options.completions)],
      icons: false,
      activateOnTyping: true
    }),
    // Tab accepts the highlighted suggestion, as Enter does; with no suggestion open it does
    // nothing here, so Tab still moves focus out of the editor.
    Prec.highest(keymap.of([{ key: 'Tab', run: acceptCompletion }])),
    completionTheme,
    EditorView.domEventHandlers({
      mousemove(event, view) {
        if (options.onPeek === undefined) return false
        const position = view.posAtCoords({ x: event.clientX, y: event.clientY })
        const found =
          (event.ctrlKey || event.metaKey) && position !== null
            ? linkNear(view, position)
            : undefined
        if (found === undefined) {
          endPeek()
          return false
        }
        const key = JSON.stringify(found.link)
        if (key !== peeked) {
          peeked = key
          options.onPeek(found.link, found.near, false)
        }
        return false
      },
      mouseleave() {
        endPeek()
        return false
      },
      mousedown(event, view) {
        if (!(event.ctrlKey || event.metaKey) || event.button !== 0) return false
        const position = view.posAtCoords({ x: event.clientX, y: event.clientY })
        if (position === null) return false
        const line = view.state.doc.lineAt(position)
        const link = linkAt(line.text, line.from, position)
        if (link === undefined) return false
        event.preventDefault()
        options.onOpenLink(link)
        return true
      }
    }),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) options.onChange(update.state.doc.toString())
      if (update.focusChanged && !update.view.hasFocus) options.onBlur()
    })
  ]
  const previous = options.state
  const state =
    previous !== undefined && previous.doc.toString() === options.text
      ? previous.update({ effects: StateEffect.reconfigure.of(extensions) }).state
      : EditorState.create({ doc: options.text, extensions })
  const view = new EditorView({ parent, state })

  return {
    setReadOnly(on) {
      view.dispatch({
        effects: editingCompartment.reconfigure([
          EditorState.readOnly.of(on),
          EditorView.editable.of(!on)
        ])
      })
    },
    setWritingDirection(direction, bookDirection) {
      view.dispatch({
        effects: directionCompartment.reconfigure(
          writingDirectionExtensions(direction, bookDirection)
        )
      })
    },
    setCopy(nextCopy) {
      copy = nextCopy
      view.dispatch({
        effects: [
          copyCompartment.reconfigure(copyExtensions(copy)),
          linksCompartment.reconfigure(linkExtensions())
        ]
      })
    },
    remeasure() {
      view.requestMeasure()
    },
    setFocusMode(on) {
      view.dispatch({ effects: focusCompartment.reconfigure(on ? focusDimming() : []) })
    },
    setLinkTargets(targets) {
      linkTargets = targets
      view.dispatch({ effects: linksCompartment.reconfigure(linkExtensions()) })
    },
    focus() {
      view.focus()
    },
    snapshot() {
      return view.state
    },
    destroy() {
      view.destroy()
    }
  }
}

function copyExtensions(copy: ProseEditorCopy): Extension {
  return [
    placeholder(copy.placeholder),
    EditorView.contentAttributes.of({ 'aria-label': copy.accessibleLabel })
  ]
}

function writingDirectionExtensions(
  direction: WritingDirection,
  bookDirection: BookDirection
): Extension {
  // Auto follows a declared book language for lines without letters; undeclared books stay `auto`.
  const base = direction === 'auto' ? (bookDirection ?? 'auto') : direction
  return [
    // Per-line direction is only enabled in Auto; explicit modes apply to the entire prose surface.
    EditorView.perLineTextDirection.of(direction === 'auto'),
    EditorView.contentAttributes.of({
      spellcheck: 'true',
      autocorrect: 'on',
      dir: base
    }),
    ...(direction === 'auto' ? [autoLineDirection(bookDirection !== null)] : [])
  ]
}

/** The link suggestions, in the app's dark palette. */
const completionTheme = EditorView.theme({
  '.cm-tooltip.cm-tooltip-autocomplete': {
    border: '1px solid var(--line-strong)',
    borderRadius: '8px',
    background: 'var(--raised)',
    fontFamily: 'var(--font-ui)',
    fontSize: '13px',
    overflow: 'hidden'
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul': {
    fontFamily: 'var(--font-ui)'
  },
  '.cm-tooltip-autocomplete > ul > li': {
    padding: '4px 10px',
    color: 'var(--text)'
  },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    background: 'var(--active)',
    color: 'var(--text-strong)'
  },
  '.cm-completionDetail': {
    marginInlineStart: '10px',
    fontStyle: 'normal',
    color: 'var(--text-muted)'
  },
  '.cm-completionLabel, .cm-completionDetail': {
    textAlign: 'start',
    unicodeBidi: 'plaintext'
  }
})
