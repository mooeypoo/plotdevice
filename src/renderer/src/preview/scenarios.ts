/** Screens the preview harness can show, for the U1 audit and U2's screenshot review. */
export const SCENARIOS = [
  'welcome',
  'initialize',
  'writing',
  'revise',
  'focus',
  'palette',
  'dock-menu',
  'peek',
  'cards',
  'overview',
  'timeline',
  'interactions',
  'board',
  'board-card-menu',
  'board-add-card',
  'board-add-column',
  'capture',
  'appearance',
  'select-open',
  'app-menu',
  'board-empty',
  'conflict'
] as const
/** A screen the harness can show. */
export type ScenarioName = (typeof SCENARIOS)[number]

/** What the URL asks the harness to show. */
export interface Scenario {
  readonly name: ScenarioName
  readonly lang: 'en' | 'he'
}

/** Reads `?scenario=…&lang=…`, falling back to Writing in English for anything unknown. */
export function parseScenario(search: string): Scenario {
  const params = new URLSearchParams(search)
  const name = params.get('scenario') ?? ''
  return {
    name: (SCENARIOS as readonly string[]).includes(name) ? (name as ScenarioName) : 'writing',
    lang: params.get('lang') === 'he' ? 'he' : 'en'
  }
}
