/**
 * The download page (Milestone 26): every published release, newest first, from releases.json. That file
 * is written by tooling/site-releases.mjs when the owner publishes a release (site-releases.yml), never
 * by hand.
 */
import data from './releases.json'

export type Kind = 'windows' | 'appimage' | 'deb' | 'mac'
export interface File {
  name: string
  url: string
  size: number
}
export interface Release {
  version: string
  date: string
  notes: string
  files: Partial<Record<Kind, File>>
}

export const RELEASES: Release[] = data.releases
export const LATEST: Release | undefined = RELEASES[0]
export const PREVIOUS: Release[] = RELEASES.slice(1)

/** Where the files are when the list is empty: GitHub's releases page. */
export const ALL_RELEASES = 'https://github.com/mooeypoo/plotdevice/releases'

/** A file's size in whole megabytes, as a reader would see it in their downloads. */
export const megabytes = (file: File): string => String(Math.round(file.size / 1_000_000))
