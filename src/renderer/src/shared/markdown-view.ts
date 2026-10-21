import MarkdownIt from 'markdown-it'
import type Token from 'markdown-it/lib/token.mjs'
import type { LinkTargetDto } from '../../../contract/dtos'
import type { LinkAt } from '../features/editor/link-at'
import { createLinkKindLookup, findWikiLinks } from '../features/editor/wiki-link-scan'

/** A rendered, read-only document beside the draft. */
export interface MarkdownView {
  setText(text: string): void
  setLinkTargets(targets: readonly LinkTargetDto[]): void
  /** Highlights passages linking to the open entry and reveals the first one. */
  highlight(pointsHere: (link: LinkAt) => boolean): void
  destroy(): void
}

const markdown = new MarkdownIt({ html: false })

markdown.inline.ruler.before('link', 'wikilink', (state, silent) => {
  if ('linkLevel' in state && typeof state.linkLevel === 'number' && state.linkLevel > 0)
    return false
  const link = findWikiLinks(state.src.slice(state.pos, state.posMax))[0]
  if (link === undefined || link.from !== 0 || link.target === '') return false
  if (!silent) {
    const open = state.push('link_open', 'a', 1)
    open.attrSet('data-markdown-kind', 'wiki')
    open.attrSet('data-markdown-target', link.target)
    const text = state.push('text', '', 0)
    text.content = state.src.slice(state.pos + link.labelFrom, state.pos + link.labelTo)
    state.push('link_close', 'a', -1)
  }
  state.pos += link.to
  return true
})

// A reference must not fetch remote images or embed arbitrary local files.
markdown.renderer.rules.image = (tokens, index) =>
  markdown.utils.escapeHtml(tokens[index]?.content ?? '')

function projectAddress(address: string): boolean {
  return (
    address !== '' &&
    !/^[a-z][a-z0-9+.-]*:/iu.test(address) &&
    !address.startsWith('//') &&
    !address.startsWith('#') &&
    !address.includes('\\')
  )
}

function decorateLinks(
  tokens: readonly Token[],
  kindOf: ReturnType<typeof createLinkKindLookup>,
  pointsHere: (link: LinkAt) => boolean
): boolean {
  let current = false
  let closingTag = 'a'
  for (const token of tokens) {
    if (token.type === 'link_open') {
      const wiki = token.attrGet('data-markdown-target')
      const address = token.attrGet('href') ?? ''
      const link: LinkAt | undefined =
        wiki !== null
          ? { kind: 'wiki', target: wiki }
          : projectAddress(address)
            ? { kind: 'markdown', address }
            : undefined
      token.attrs = null
      if (link === undefined) {
        token.tag = 'span'
        token.attrSet('title', address)
        token.attrSet('class', 'markdown-reference')
      } else {
        token.attrSet('href', '#')
        token.attrSet('dir', 'auto')
        token.attrSet('data-markdown-kind', link.kind)
        token.attrSet('data-markdown-target', link.kind === 'wiki' ? link.target : link.address)
        token.attrSet(
          'class',
          `markdown-link markdown-link-${link.kind === 'wiki' ? kindOf(link.target) : 'chapter'}`
        )
        current ||= pointsHere(link)
      }
      closingTag = token.tag
    } else if (token.type === 'link_close') {
      token.tag = closingTag
    }
  }
  return current
}

/** Renders Markdown with inert HTML/images and explicitly routed project links. */
export function renderMarkdown(
  text: string,
  targets: readonly LinkTargetDto[],
  pointsHere: (link: LinkAt) => boolean
): string {
  const tokens = markdown.parse(text, {})
  const parents: Token[] = []
  const kindOf = createLinkKindLookup(targets)
  for (const token of tokens) {
    if (
      ['paragraph_open', 'heading_open', 'list_item_open', 'th_open', 'td_open'].includes(
        token.type
      )
    )
      token.attrSet('dir', 'auto')
    if (token.nesting === -1) parents.pop()
    if (token.type === 'inline' && token.children !== null) {
      if (decorateLinks(token.children, kindOf, pointsHere)) {
        const block = parents.findLast((parent) => !parent.hidden)
        block?.attrJoin('class', 'markdown-current')
      }
    }
    if (token.nesting === 1) parents.push(token)
  }
  return markdown.renderer.render(tokens, markdown.options, {})
}

/** Mounts rendered Markdown; project links open through the app rather than navigating. */
export function createMarkdownView(
  parent: HTMLElement,
  options: {
    readonly text: string
    readonly linkTargets: readonly LinkTargetDto[]
    readonly onOpenLink: (link: LinkAt) => void
  }
): MarkdownView {
  let text = options.text
  let targets = options.linkTargets
  let pointsHere: (link: LinkAt) => boolean = () => false
  const render = (): void => {
    parent.innerHTML = renderMarkdown(text, targets, pointsHere)
  }
  const reveal = (): void => {
    parent.querySelector('.markdown-current')?.scrollIntoView({ block: 'nearest' })
  }
  const click = (event: MouseEvent): void => {
    const anchor = event.target instanceof Element ? event.target.closest('a') : null
    if (anchor === null || !parent.contains(anchor)) return
    event.preventDefault()
    const target = anchor.getAttribute('data-markdown-target')
    if (target === null) return
    options.onOpenLink(
      anchor.getAttribute('data-markdown-kind') === 'wiki'
        ? { kind: 'wiki', target }
        : { kind: 'markdown', address: target }
    )
  }
  parent.addEventListener('click', click)
  render()
  return {
    setText(next) {
      if (text === next) return
      text = next
      render()
      reveal()
    },
    setLinkTargets(next) {
      targets = next
      render()
    },
    highlight(next) {
      pointsHere = next
      render()
      reveal()
    },
    destroy() {
      parent.removeEventListener('click', click)
      parent.replaceChildren()
    }
  }
}
