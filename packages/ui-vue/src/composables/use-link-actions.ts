import { linkTargets, type LinkTarget } from '@plotdevice/presentation'
import { dirnameOf, relativePath, resolveRelative, stemOf, type ProjectPath } from '@plotdevice/shared'
import { usePrompt } from './use-prompt'
import { useLinkPicker } from './use-link-picker'
import { useProjectStore } from '../stores/project'
import { useSettingsStore } from '../stores/settings'
import { useStoryStore } from '../stores/story'
import { useViewStore } from '../stores/view'

const isWeb = (target: string): boolean => /^[a-z][a-z0-9+.-]*:/i.test(target)

function decoded(target: string): string {
  try {
    return decodeURI(target)
  } catch {
    return target
  }
}

/**
 * What the link popup does (Milestone 16): name where a link goes, open it, and choose somewhere else
 * for it. Links are read as written in the file at `from`; nothing is inferred from names, except a
 * wikilink's page name, which must match exactly one page (DOMAIN_AND_FILE_FORMAT, "Links").
 */
export function useLinkActions() {
  const project = useProjectStore()
  const story = useStoryStore()
  const view = useViewStore()
  const t = useSettingsStore().t
  const { pick } = useLinkPicker()
  const { ask } = usePrompt()

  function resolve(from: ProjectPath, target: string): LinkTarget | null {
    if (!project.project || isWeb(target)) return null
    const targets = linkTargets(project.project, story.references)
    const path = resolveRelative(dirnameOf(from), decoded(target))
    const exact = targets.find((each) => each.file === path)
    if (exact) return exact
    const named = targets.filter((each) => stemOf(each.file) === target)
    return named.length === 1 ? (named[0] ?? null) : null
  }

  /** What the popup says the link goes to: the page's or chapter's title, or the address as written. */
  const nameOf = (from: ProjectPath, target: string): string => resolve(from, target)?.title ?? target

  function open(from: ProjectPath, target: string): void {
    if (isWeb(target)) {
      // The app's window rules decide what may open in the browser.
      window.open(target, '_blank', 'noreferrer')
      return
    }
    const found = resolve(from, target)
    if (!found) return
    if (found.kind === 'chapter') view.writeChapter(found.file)
    else {
      story.showing = { kind: 'page', file: found.file }
      view.workspace = 'story'
    }
  }

  /** Somewhere else for the link: a page or chapter from the picker, or a web address for a web link. `null` if cancelled. */
  async function choose(from: ProjectPath, current: string): Promise<string | null> {
    if (isWeb(current)) return (await ask(t('prompt-link'), current)) || null
    const target = await pick()
    return target ? relativePath(dirnameOf(from), target.file) : null
  }

  return { nameOf, open, choose }
}
