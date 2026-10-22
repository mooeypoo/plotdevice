import type { MessageKey } from '../../../i18n/translator'
import type { ViewId } from '../workbench/model/view-catalog'

/** The views that exist, by id, with the message that titles each. */
export type ViewDirectory = Partial<Readonly<Record<ViewId, { readonly title: MessageKey }>>>

let directory: ViewDirectory = {}

/**
 * Publishes the registered views for app code that lists them (the command palette). The view
 * registry calls this; app code reads it here instead of importing the registry, which imports
 * the feature components that use the app.
 */
export function publishViewDirectory(views: ViewDirectory): void {
  directory = views
}

/** The registered views, as last published. */
export function viewDirectory(): ViewDirectory {
  return directory
}
