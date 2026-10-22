import { computed, getCurrentScope, onScopeDispose, type ComputedRef, type Ref } from 'vue'
import { useCodexStore } from './codex-store'
import { useEditorStore } from './editor-store'
import { useManuscriptStore } from './manuscript-store'
import { useReferenceStore } from './reference-store'
import { placeOf } from './entry-owners'
import { linkChoices, markdownLinkPath, nameKey, resolveWritten } from '../shared/link-choices'
import type { LinkAt } from '../shared/link-at'
import type { LinkCompletionTarget } from '../features/editor/link-completion'
import { useErrorNotice } from '../shared/use-error-notice'
import type { LinkNotice } from '../shared/error-format'

/** Link completion and navigation: consult codex targets beside the draft, or open manuscript text. */
export function useEditorLinks(navigate?: (path: string) => void | Promise<void>): {
  readonly completions: ComputedRef<readonly LinkCompletionTarget[]>
  /** Opens a link's target; a markdown link is read relative to `fromPath` (the open entry). */
  readonly openLink: (link: LinkAt, fromPath?: string) => Promise<void>
  /** The project file a link points to, read from `fromPath` (the open entry by default). */
  readonly resolveLink: (link: LinkAt, fromPath?: string) => string | undefined
  /** Whether a link means the file at `path`, read from the file at `fromPath`. */
  readonly linkMeans: (link: LinkAt, path: string, fromPath: string) => boolean
  /** Why the last Ctrl/Cmd+click opened nothing; clears itself after a few seconds. */
  readonly linkNotice: Ref<string | null>
} {
  const manuscript = useManuscriptStore()
  const codex = useCodexStore()
  const editor = useEditorStore()
  const { message: linkNotice, source: linkNoticeSource } = useErrorNotice()
  let clearTimer: ReturnType<typeof setTimeout> | undefined
  const notify = (notice: LinkNotice): void => {
    linkNoticeSource.value = notice
    if (clearTimer !== undefined) clearTimeout(clearTimer)
    clearTimer = setTimeout(() => {
      linkNotice.value = null
      clearTimer = undefined
    }, 5000)
  }
  if (getCurrentScope() !== undefined)
    onScopeDispose(() => {
      if (clearTimer !== undefined) clearTimeout(clearTimer)
      linkNotice.value = null
    })

  const choices = computed(() => linkChoices(manuscript.manuscript?.linkTargets ?? []))
  const aliases = computed(
    () => new Map((codex.listing?.entries ?? []).map((entry) => [entry.path, entry.aliases]))
  )
  const completions = computed<readonly LinkCompletionTarget[]>(() =>
    choices.value.map((choice) => ({ ...choice, aliases: aliases.value.get(choice.path) ?? [] }))
  )

  function targetOf(link: LinkAt, from: string | undefined): string | undefined {
    if (link.kind === 'wiki') return resolveWritten(choices.value, link.target)?.path
    const address = from === undefined ? undefined : markdownLinkPath(link.address, from)
    return address === undefined
      ? undefined
      : choices.value.find((choice) => nameKey(choice.path) === nameKey(address))?.path
  }

  async function openLink(link: LinkAt, fromPath?: string): Promise<void> {
    const path = targetOf(link, fromPath ?? editor.entry?.path)
    if (path === undefined) {
      notify(
        link.kind === 'wiki'
          ? { notice: 'link-wiki-unresolved', target: link.target }
          : { notice: 'link-markdown-unresolved', address: link.address }
      )
      return
    }
    if (navigate !== undefined) await navigate(path)
    else if (['character', 'location', 'note'].includes(placeOf(path)?.kind ?? '')) {
      useReferenceStore().open(path)
    } else if (editor.canOpen(path)) {
      await editor.open(path)
    } else editor.reportActionError({ notice: 'link-target-unsupported', path })
  }

  return {
    completions,
    openLink,
    resolveLink: (link, fromPath) => targetOf(link, fromPath ?? editor.entry?.path),
    linkNotice,
    linkMeans: (link, path, fromPath) => {
      const target = targetOf(link, fromPath)
      return target !== undefined && nameKey(target) === nameKey(path)
    }
  }
}
