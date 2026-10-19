import type { EntryKind, EntryPlace } from './entry-place'

/** What the editor needs from the store that lists entries of a kind and holds their properties. */
export interface EntryOwner {
  placeOf(path: string): EntryPlace | undefined
  /** Reads the entry's properties; returns the file version they came from. */
  readProperties(path: string): Promise<string | undefined>
  reload(): Promise<void>
  /** Keeps listed word counts current as the entry is saved. */
  addWords(path: string, delta: number): void
}

const owners = new Map<EntryKind, () => EntryOwner>()

/**
 * Registers the store that owns some kinds of entry. The editor store looks owners up here
 * instead of importing them, since they import the editor store.
 */
export function registerEntryOwner(kinds: readonly EntryKind[], owner: () => EntryOwner): void {
  for (const kind of kinds) owners.set(kind, owner)
}

/** The store that owns entries of `kind`. */
export function entryOwner(kind: EntryKind): EntryOwner | undefined {
  return owners.get(kind)?.()
}

/** Where an entry sits, asking every registered owner. */
export function placeOf(path: string): EntryPlace | undefined {
  for (const owner of new Set(owners.values())) {
    const place = owner().placeOf(path)
    if (place !== undefined) return place
  }
  return undefined
}
