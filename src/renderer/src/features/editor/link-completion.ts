import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete'
import type { LinkChoice } from '../../shared/link-choices'

/** A file the writer can link to, with its other names (`aliases`). */
export interface LinkCompletionTarget extends LinkChoice {
  readonly aliases: readonly string[]
}

const TYPED_LINK = /\[\[([^[\]\n|#]*)$/u

/**
 * The completions for a link being typed: each file by name, showing its type, and each of its
 * other names. Choosing an alias writes `[[Name|alias]]`; a name another file shares is written
 * with its folder.
 */
export function linkCompletions(targets: readonly LinkCompletionTarget[]): Completion[] {
  return targets.flatMap((target) => {
    const type = target.type ?? 'untyped'
    const byName: Completion = {
      label: target.name.normalize('NFC'),
      detail: target.target === target.name.normalize('NFC') ? type : `${type} · ${target.target}`,
      apply: target.target,
      type
    }
    const byAlias = target.aliases.map((alias): Completion => ({
      label: alias,
      detail: `${target.name.normalize('NFC')} · ${type}`,
      apply: `${target.target}|${alias}`,
      type
    }))
    return [byName, ...byAlias]
  })
}

/** A CodeMirror completion source for `[[…` that closes the link with `]]` when needed. */
export function linkCompletionSource(
  targets: () => readonly LinkCompletionTarget[]
): (context: CompletionContext) => CompletionResult | null {
  return (context) => {
    const line = context.state.doc.lineAt(context.pos)
    const before = line.text.slice(0, context.pos - line.from)
    const typed = TYPED_LINK.exec(before)
    if (typed === null) return null
    const from = context.pos - (typed[1]?.length ?? 0)
    const closed = line.text.slice(context.pos - line.from).startsWith(']]')
    return {
      from,
      options: linkCompletions(targets()).map((option) => ({
        ...option,
        apply: `${String(option.apply)}${closed ? '' : ']]'}`
      })),
      validFor: /^[^[\]\n|#]*$/u
    }
  }
}
