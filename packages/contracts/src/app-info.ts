import { z } from 'zod'

export const appInfoSchema = z.strictObject({
  name: z.string(),
  version: z.string(),
  platform: z.enum(['linux', 'win32', 'darwin', 'other']),
})

export type AppInfo = z.infer<typeof appInfoSchema>

/** An open-source package the app includes, for the About window's credits. */
export interface ThirdPartyPackage {
  name: string
  version: string
  license: string
  homepage: string | null
}

export interface AboutView {
  name: string
  version: string
  /** The GNU GPL, as shipped with the app (English, as published by the FSF). */
  licenseText: string
  thirdParty: ThirdPartyPackage[]
}
