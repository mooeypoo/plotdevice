import type { FileStore, JournalEntry, JournalStep, JournalStore, RecoveryOutcome, Revision } from '@plotdevice/application'
import type { ProjectPath } from '@plotdevice/shared'

/** Test seam: return true to simulate a crash at a named point. Production passes nothing. */
export type CrashAt = (point: string) => boolean

class SimulatedCrash extends Error {
  constructor(point: string) {
    super(`simulated crash at ${point}`)
  }
}

function checkpoint(crashAt: CrashAt | undefined, point: string): void {
  if (crashAt?.(point)) throw new SimulatedCrash(point)
}

type StepState = 'pending' | 'done' | 'conflict'

async function revisionAt(store: FileStore, path: ProjectPath): Promise<Revision | null> {
  const read = await store.read(path)
  return read.ok ? read.value.revision : null
}

/** Whether a step is still to do, already done, or contradicted by a change made outside the app. */
async function stateOf(store: FileStore, step: JournalStep): Promise<StepState> {
  if (step.kind === 'write') {
    const current = await revisionAt(store, step.path)
    return current === step.after ? 'done' : current === step.before ? 'pending' : 'conflict'
  }
  const [source, target] = [await revisionAt(store, step.from), await revisionAt(store, step.to)]
  if (source === null && target === step.revision) return 'done'
  if (source === step.revision && target === null) return 'pending'
  return 'conflict'
}

async function apply(store: FileStore, step: JournalStep): Promise<boolean> {
  if (step.kind === 'rename') return (await store.rename(step.from, step.to, step.revision)).ok
  return (await store.write(step.path, { text: step.text, hasBom: step.hasBom }, step.before)).ok
}

/**
 * Runs a multi-file operation through the journal (ADR 0005): the journal is saved first (the commit
 * point), then each step runs in order, then the journal is removed. An interruption anywhere is finished
 * by `recoverJournals` on the next open.
 */
export async function runJournaled(
  store: FileStore,
  journals: JournalStore,
  projectKey: string,
  entry: JournalEntry,
  crashAt?: CrashAt,
): Promise<'done' | 'step-failed'> {
  await journals.save(projectKey, entry)
  checkpoint(crashAt, 'journal-saved')
  for (const [index, step] of entry.steps.entries()) {
    // A failed step leaves the journal in place: the next open reports or finishes it.
    if (!(await apply(store, step))) return 'step-failed'
    checkpoint(crashAt, `step-${index}`)
  }
  await journals.remove(projectKey, entry.id)
  return 'done'
}

/**
 * Finishes interrupted operations. If any file was changed outside the app in the meantime, nothing is
 * applied: the operation is reported and its journal kept, so the author decides (ADR 0005).
 */
export async function recoverJournals(store: FileStore, journals: JournalStore, projectKey: string): Promise<RecoveryOutcome[]> {
  const outcomes: RecoveryOutcome[] = []
  for (const entry of await journals.list(projectKey)) {
    const states = await Promise.all(entry.steps.map((step) => stateOf(store, step)))
    const conflicts = entry.steps.filter((_, i) => states[i] === 'conflict').map((step) => (step.kind === 'write' ? step.path : step.from))
    if (conflicts.length > 0) {
      outcomes.push({ journal: entry.id, outcome: 'needs-attention', files: conflicts })
      continue
    }
    let failed: ProjectPath | null = null
    for (const [index, step] of entry.steps.entries()) {
      if (states[index] !== 'pending') continue
      if (!(await apply(store, step))) {
        failed = step.kind === 'write' ? step.path : step.from
        break
      }
    }
    if (failed) {
      outcomes.push({ journal: entry.id, outcome: 'needs-attention', files: [failed] })
      continue
    }
    await journals.remove(projectKey, entry.id)
    outcomes.push({ journal: entry.id, outcome: 'completed' })
  }
  return outcomes
}
