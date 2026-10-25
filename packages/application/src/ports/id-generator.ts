/** Creates short random IDs such as `ch-k3f9q2` (ADR 0008): chapters, projects and recovery journals. */
export interface IdGenerator {
  next(prefix: 'ch' | 'prj' | 'jrn'): string
}
