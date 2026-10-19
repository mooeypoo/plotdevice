declare const projectRootBrand: unique symbol

/**
 * The absolute path of a project folder on this machine. The domain treats it as an opaque
 * identity; infrastructure creates, validates, and compares it.
 */
export type ProjectRoot = string & { readonly [projectRootBrand]: true }
