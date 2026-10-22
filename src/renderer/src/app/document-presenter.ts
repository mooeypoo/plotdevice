/** Whatever arranges the screen: it brings the writable document forward after navigation. */
export interface DocumentPresenter {
  showDocument(): void
}

let presenter: (() => DocumentPresenter) | undefined

/**
 * Registers the store that arranges the screen. The editor store looks it up here instead of
 * importing a layout, so the old shell and the workbench can each present the document.
 */
export function registerDocumentPresenter(present: () => DocumentPresenter): void {
  presenter = present
}

/** The registered presenter, if a shell has registered one. */
export function documentPresenter(): DocumentPresenter | undefined {
  return presenter?.()
}
