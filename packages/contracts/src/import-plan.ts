import { z } from 'zod'

// How the author split a Word file in the preview (Milestone 23); its own file, so a new book's
// request (project.ts) and the import's own requests (import.ts) can both use it.

const index = z.number().int().min(0).max(1_000_000)

export const splitEditsSchema = z.strictObject({
  starts: z.array(index).max(100_000),
  joins: z.array(index).max(100_000),
  names: z.record(z.string().regex(/^\d{1,7}$/), z.string().max(500)),
  leftOut: z.array(index).max(100_000),
})
export const importPlanSchema = z.strictObject({
  split: z.enum(['headings', 'chapter-lines', 'page-breaks']),
  edits: splitEditsSchema,
})
export type ImportPlanRequest = z.input<typeof importPlanSchema>
export type SplitByView = ImportPlanRequest['split']
