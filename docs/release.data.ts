import { readFileSync } from 'node:fs'
import { releaseStateSchema, type ReleaseState } from '../tools/release/published-release.ts'
import { releaseStatePath } from '../tools/docs/release-data.ts'

declare const data: ReleaseState
export { data }

export default {
  watch: ['.vitepress/release-state.json'],
  load(): ReleaseState {
    return releaseStateSchema.parse(JSON.parse(readFileSync(releaseStatePath, 'utf8')) as unknown)
  }
}
