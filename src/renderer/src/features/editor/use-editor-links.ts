import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { useCodexStore } from '../../app/codex-store'
import { useEditorStore } from '../../app/editor-store'
import { useManuscriptStore } from '../../app/manuscript-store'
import { useReferenceStore } from '../../app/reference-store'
import { useLayoutStore } from '../../app/layout-store'
import { placeOf } from '../../app/entry-owners'
import { linkChoices, markdownLinkPath, nameKey, resolveWritten } from '../../shared/link-choices'
import type { LinkAt } from './link-at'
import type { LinkCompletionTarget } from './link-completion'

/** Link completion and navigation: consult codex targets beside the draft, or open manuscript text. */
export function useEditorLinks(navigate?: (path: string) => void | Promise<void>): {
  readonly completions: ComputedRef<readonly LinkCompletionTarget[]>
  /** Opens a link's target; a markdown link is read relative to `fromPath` (the open entry). */
  readonly openLink: (link: LinkAt, fromPath?: string) => Promise<void>
  /** Whether a link means the file at `path`, read from the file at `fromPath`. */
  readonly linkMeans: (link: LinkAt, path: string, fromPath: string) => boolean
  /** Why the last Ctrl/Cmd+click opened nothing; clears itself after a few seconds. */
  readonly linkNotice: Ref<string | null>
} {
  const manuscript = useManuscriptStore()
  const codex = useCodexStore()
  const editor = useEditorStore()
  const linkNotice = ref<string | null>(null)
  let clearTimer: ReturnType<typeof setTimeout> | undefined
  const notify = (message: string): void => {
    linkNotice.value = message
    if (clearTimer !== undefined) clearTimeout(clearTimer)
    clearTimer = setTimeout(() => {
      linkNotice.value = null
    }, 5000)
  }

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
          ? `“${link.target}” doesn’t point to one file. Write it with its folder to open it.`
          : `“${link.address}” isn’t a file in this project.`
      )
      return
    }
    if (navigate !== undefined) await navigate(path)
    else if (['character', 'location', 'note'].includes(placeOf(path)?.kind ?? '')) {
      useReferenceStore().open(path)
    } else if (editor.canOpen(path)) {
      if (await editor.open(path)) useLayoutStore().mainView = 'write'
    } else
      editor.actionError = `${path} isn’t a part, chapter, or codex entry, so it can’t open here.`
  }

  return {
    completions,
    openLink,
    linkNotice,
    linkMeans: (link, path, fromPath) => {
      const target = targetOf(link, fromPath)
      return target !== undefined && nameKey(target) === nameKey(path)
    }
  }
}
