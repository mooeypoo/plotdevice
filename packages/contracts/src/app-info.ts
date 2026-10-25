import { z } from 'zod'

export const appInfoSchema = z.strictObject({
  name: z.string(),
  version: z.string(),
  platform: z.enum(['linux', 'win32', 'darwin', 'other']),
})

export type AppInfo = z.infer<typeof appInfoSchema>
