/** Creates short random IDs such as `ch-k3f9q2` (ADR 0008). Random, so the domain stays pure. */
export interface IdGenerator {
  next(prefix: 'ch' | 'prj'): string
}
