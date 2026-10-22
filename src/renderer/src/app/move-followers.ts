/** Something that shows a document by path and must keep showing it when the app moves the file. */
export interface MoveFollower {
  followMove(from: string, to: string): void
}

const followers: (() => MoveFollower)[] = []

/**
 * Registers a store that keeps documents open by path, such as a reader. The editor store tells
 * every follower about the app's own moves and renames without importing them.
 */
export function registerMoveFollower(follower: () => MoveFollower): void {
  followers.push(follower)
}

/** Tells every registered follower that the app moved `from` to `to`. */
export function documentMoved(from: string, to: string): void {
  for (const follower of followers) follower().followMove(from, to)
}
