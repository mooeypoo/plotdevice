import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { useCodexStore } from '../../app/codex-store'
import { useEditorStore } from '../../app/editor-store'
import { useManuscriptStore } from '../../app/manuscript-store'
import { linkChoices, markdownLinkPath, nameKey, resolveWritten } from '../../shared/link-choices'
import type { LinkAt } from './link-at'
import type { LinkCompletionTarget } from './link-completion'

/** The editor's links: what `[[` suggests, and opening a link's target. */
export function useEditorLinks(): {
  readonly completions: ComputedRef<readonly LinkCompletionTarget[]>
  readonly openLink: (link: LinkAt) => Promise<void>
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

  async function openLink(link: LinkAt): Promise<void> {
    let path: string | undefined
    if (link.kind === 'wiki') {
      path = resolveWritten(choices.value, link.target)?.path
    } else {
      const from = editor.entry?.path
      const address = from === undefined ? undefined : markdownLinkPath(link.address, from)
      path =
        address === undefined
          ? undefined
          : choices.value.find((choice) => nameKey(choice.path) === nameKey(address))?.path
    }
    if (path === undefined) {
      notify(
        link.kind === 'wiki'
          ? `“${link.target}” doesn’t point to one file. Write it with its folder to open it.`
          : `“${link.address}” isn’t a file in this project.`
      )
      return
    }
    if (editor.canOpen(path)) await editor.open(path)
    else
      editor.actionError = `${path} isn’t a part, chapter, or codex entry, so it can’t open here.`
  }

  return { completions, openLink, linkNotice }
}
