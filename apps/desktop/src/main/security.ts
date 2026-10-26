import { shell, type Session, type WebContents } from 'electron'
import { isAllowedExternalLink } from './external-links'

/**
 * The renderer may not navigate away, open windows or embed other pages. A link to one of the few
 * allowed pages (external-links.ts) opens in the person's browser instead.
 */
export function hardenWebContents(contents: WebContents): void {
  contents.on('will-navigate', (event) => event.preventDefault())
  contents.on('will-attach-webview', (event) => event.preventDefault())
  contents.setWindowOpenHandler(({ url }) => {
    if (isAllowedExternalLink(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
}

/** No camera, microphone, notifications or other permissions: the app needs none. */
export function denyAllPermissions(session: Session): void {
  session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false))
  session.setPermissionCheckHandler(() => false)
}
